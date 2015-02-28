# zip-blocks v0.1.2

Interface to zip files in blocks of predetermined size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, outputDir, [blockSize])

Creates zip archives of all files at the root of `inputDir`, grouping files into blocks of less than or equal to the specified size.
`blockSize` defaults to 20MB if no value is provided. The assumed compression ratio used to determine the maximum number of files per block defaults to 1 (equivalent to no compression).

#### setCompressionRatio(ratio)

Sets the assumed compression ratio to the provided value - from 0.01 to 1, inclusive. Note that setting the compression ratio does not affect the actual zip compression performance.

#### on(event, callback)

### Events

#### error

Fired whenever an error occurs in the process.

## Example

```js
var ZipBlocks = require('zip-blocks')
  , zip = new ZipBlocks()
  , maxZipSize = 2; // in MB

zip.on('error', function (err) { /* handdle error */ });

zip.zipFilesInDir('files/in', 'files/out', maxZipSize);
```
## Dependencies

[archiver](https://www.npmjs.com/package/archiver)

