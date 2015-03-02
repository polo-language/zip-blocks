# zip-blocks v0.1.4

Interface to zip files in blocks of predetermined size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, [outputDir], [settings])

Creates zip archives of all files at the root of `inputDir`, grouping files into blocks of less than or equal to the specified `blockSize`. If no `outputDir` is provided, zip files are written to `inputDir`.

Settings is an object which can contain keys from among the following (default values are given):
```js
{
  blockSize: 20,
  compressionRatio: 1
}
```

#### setCompressionRatio(ratio)

Sets the assumed compression ratio to the provided value (from 0.01 to 1, inclusive). The assumed compression ratio is used to determine the maximum number of files per block. The default is 1 (equivalent to no compression). Note that setting the compression ratio does not affect the actual zip compression performance.

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

zip.zipFilesInDir('files/in', 'files/out', { blockSize: maxZipSize });
```
## Dependencies

[archiver](https://www.npmjs.com/package/archiver)

