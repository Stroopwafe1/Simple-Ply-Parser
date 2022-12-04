const fs = require('node:fs');
const path = require('node:path');

const filepath = process.argv[2];
if (!filepath) return console.error('Needs a filepath as 1st argument');

const file = fs.readFileSync(filepath, 'utf8');
const parts = file.split('end_header');

const header = parts[0] + 'end_header\n';
const after_header = parts[1];

const elements = header.split('element');

const elems = [];

console.log(elements[0]);

const writeFloat = (val) => {
    buf.writeFloatLE(val, offset);
    offset += 4;
}

const writeUint = (val) => {
    buf.writeUInt32LE(val, offset);
    offset += 4;
}

const writeUChar = (val) => {
    buf.writeUInt8(val, offset);
    offset += 1;
}

const typesize = (input) => {
    switch (input) {
        case "uchar":
        case "char":
            return 1;
        case "ushort":
        case "short":
            return 2;
        case "uint":
        case "int":
        case "float":
            return 4;
        case "double":
            return 8;
    }
}

for (let i = 1; i < elements.length; i++) {
    const lines = elements[i].split('\n');
    const element_name = lines[0].trim().split(' ')[0];
    const element_count = lines[0].trim().split(' ')[1];
    const props = [];
    for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        let line_split = line.split(' ');
        if (line_split[1] !== 'list')
            props.push({type: line_split[1], name: line_split[2]});
        else
            props.push({type1: line_split[2], type2: line_split[3], name: line_split[4]});
    }

    elems.push({name: element_name, count: Number(element_count), properties: props.filter(prop => prop.hasOwnProperty('name') && prop.name !== undefined)});
}

const values = after_header.split('\n');
let coords = [];
let normals = [];
let uvs = [];
let rgb = [];
const vertex_indices = [];

let alloc_size = 0;

const has_alpha = elems.find(elem => elem.properties.hasOwnProperty('alpha')) !== undefined;
console.log(`Has alpha: ${has_alpha}`);

for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    let shiftCount = 0;

    for (let j = 0; j <= elem.count; j++) {
        const vals = values[j].split(' ');
        shiftCount += 1;
        let temp_vals = [];
        for (let k = 0; k < vals.length; k++) {
            if (k >= elem.properties.length) continue;
            if (['x', 'y', 'z'].includes(elem.properties[k].name)) {
                temp_vals.push(Number(vals[k]));
                alloc_size += typesize(elem.properties[k].type);
                if (elem.properties[k].name === 'z') {
                    coords = coords.concat(temp_vals)
                    temp_vals = [];
                }
            }
            else if (['nx', 'ny', 'nz'].includes(elem.properties[k].name)) {
                temp_vals.push(Number(vals[k]));
                alloc_size += typesize(elem.properties[k].type);
                if (elem.properties[k].name === 'nz') {
                    normals = normals.concat(temp_vals)
                    temp_vals = [];
                }
            }
            else if (['s', 't'].includes(elem.properties[k].name)) {
                temp_vals.push(Number(vals[k]));
                alloc_size += typesize(elem.properties[k].type);
                if (elem.properties[k].name === 't') {
                    uvs = uvs.concat(temp_vals);
                    temp_vals = [];
                }
            }
            else if (['red', 'green', 'blue', 'alpha'].includes(elem.properties[k].name)) {
                temp_vals.push(Number(vals[k]));
                alloc_size += typesize(elem.properties[k].type);
                if ((elem.properties[k].name === 'blue' && !has_alpha) || elem.properties[k].name === 'alpha') {
                    rgb = rgb.concat(temp_vals);
                    temp_vals = [];
                }
            }
            else if (elem.properties[k].name === 'vertex_indices') {
                let count = Number(vals.shift());
                vertex_indices.push(vals.map(val => Number(val)));
                alloc_size += typesize(elem.properties[k].type1);
                alloc_size += (typesize(elem.properties[k].type2) * count);
            }
        }
    }
    for (let j = 0; j < shiftCount; j++) {
        values.shift();
    }
}

const buf = Buffer.alloc(alloc_size);
let offset = 0;

const vertices = elems[0];
for (let i = 0; i < vertices.count; i++) {
    for (let j = 0; j < vertices.properties.length; j++) {
        if (['x', 'y', 'z'].includes(vertices.properties[j].name)) {
            writeFloat(coords[j + (i * 3)]);
        }
        else if (['nx', 'ny', 'nz'].includes(vertices.properties[j].name)) {
            writeFloat(normals[j - 3 + (i * 3)]);
        }
        else if (['s', 't'].includes(vertices.properties[j].name)) {
            writeFloat(uvs[j - 6 + (i * 2)]);
        }
        else if (['red', 'green', 'blue', 'alpha'].includes(vertices.properties[j].name)) {
            writeUChar(rgb[j - 8 + (i * (has_alpha ? 4 : 3))]);
        }
    }
}

vertex_indices.forEach(arr => {
    writeUChar(arr.length);
    arr.forEach(index => writeUint(index));
});

const filename = path.win32.basename(filepath, path.extname(filepath));
const newPath = filepath.replace(filename, filename + '_LE');
const newHeader = header.replace('ascii', 'binary_little_endian');

const fd = fs.openSync(newPath, 'w');
const bytes = fs.writeSync(fd, newHeader);
fs.writeSync(fd, buf, {position: bytes});
fs.closeSync(fd);
