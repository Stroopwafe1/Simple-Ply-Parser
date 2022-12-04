# Simple Ply Parser
This is a simple ply parser to transform the .ply model file to the different type of file formats.

## Supported parsers
- Ascii -> Little Endian
- Big Endian -> Little Endian
- Little Endian -> Ascii
- Little Endian -> Big Endian

## Usage
```console
node little-to-big.js /path/to/little_endian/ply/file.ply
```
Both absolute and relative paths are supported

## Why?
I needed a way to convert ply files from one type to another. Most files are either only available in ASCII or Little Endian.

## References
- Ply spec: http://paulbourke.net/dataformats/ply/