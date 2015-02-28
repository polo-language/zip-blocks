# zip-blocks v0.1.0

Node.js interface to zip files in blocks of predetermined size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, outputDir, [blockSize])

Creates zip archives of all files at the root of `inputDir`, grouping files into blocks of less than or equal to the specified size.
`blockSize` defaults to 20MB if no value is provided. The value used to determine how many files to place in each block defaults to 1 (equivalent to no compression - for already compressed formats).

#### setCompressionRatio(ratio)

Sets the assumed compression ratio used to determine how many files to place into a block to the provided value if it is between 0.01 and 1, inclusive. The default compression ratio is 1 (no compression). Not that setting the compression ratio does not affect the actual zip compression.

#### on(event, callback)

### Events

#### error

Fired whenever an error occurs in the process.

## Example

```js
var ZipBlocks = require('./zip-blocks')
  , zip = new ZipBlocks()
  , inPath = 'files/in'
  , outPath = 'files/out'
  , maxZipSize = 2; // in MB

zip.on('error', function (err) { /* handdle error */ });

zip.zipFilesInDir(inPath, outPath, maxZipSize);
```
## Dependencies

[archiver](https://www.npmjs.com/package/archiver)

