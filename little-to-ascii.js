const fs = require('node:fs');
const path = require('node:path');

const filepath = process.argv[2];
if (!filepath) return console.error('Needs a filepath as 1st argument');

const file = fs.readFileSync(filepath);
const index_of_header = file.indexOf('end_header') + 'end_header\n'.length;

const header = file.toString('utf8', 0, index_of_header);
const elements = header.split('element');

const elems = [];

for (let i = 1; i < elements.length; i++) {
    const lines = elements[i].split('\n');
    const element_name = lines[0].trim().split(' ')[0];
    const element_count = lines[0].trim().split(' ')[1];
    const props = [];
    for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        let line_split = line.split(' ');
        props.push({type: line_split[1], name: line_split[2]});
    }

    elems.push({name: element_name, count: Number(element_count), properties: props.filter(prop => prop.hasOwnProperty('name') && prop.name !== undefined)});
}

const data = file.subarray(index_of_header);
const strings = [];
let ascii = "";

let offset = 0;

for (let i = 0; i < elems.length; i++) {
    if (i === 0) {
        for (let j = 0; j < elems[i].count; j++) {
            for (let k = 0; k < elems[i].properties.length; k++) {
                switch (elems[i].properties[k].type) {
                    case 'float':
                        const valf = data.readFloatLE(offset);
                        ascii += `${valf.toFixed(6)} `;
                        offset += 4;
                        break;
                    case 'uchar':
                        const valu = data.readUInt8(offset);
                        ascii += `${valu} `;
                        offset += 1;
                        break;
                }
            }
            strings.push(ascii);
            ascii = '';
        }
        process.stdout.write('\n');
    } else {
        ascii = '';
        console.log(offset);
        for (let j = 0; j < elems[i].count; j++) {
            const count = data.readUInt8(offset);
            ascii += `${count}`;
            offset += 1;
            for (let k = 0; k < count; k++) {
                const val = data.readInt32LE(offset);
                ascii += ` ${val}`;
                offset += 4;
            }
            strings.push(ascii);
            ascii = '';
        }
    }
}

const filename = path.win32.basename(filepath, path.extname(filepath));
const newPath = filepath.replace(filename, filename + '_ASCII');
const newHeader = header.replace('binary_little_endian', 'ascii');

const fd = fs.openSync(newPath, 'w');
const bytes = fs.writeSync(fd, newHeader);
fs.writeSync(fd, strings.join('\n'));
fs.closeSync(fd);
