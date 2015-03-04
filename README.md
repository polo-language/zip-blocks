# zip-blocks v0.2.0

Interface to zip files in blocks of predetermined size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, [outputDir], [options])

Creates zip archives of all files at the root of `inputDir`, grouping files into blocks of less than or equal to the specified `blockSize`. If no `outputDir` is provided, zip files are written to `inputDir`. If `filesOnly` is set to false, directories at the root of `inputDir` will be included as well.

Options is an object which can contain keys from among the following (default values are given):
```js
{
  blockSize: 20, // in MB
  compressionRatio: 1,
  filesOnly: true
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
  , options = {
      blockSize: 2,     // in MB
      filesOnly: false  // include directories
    };

zip.on('error', function (err) { /* handdle error */ });

zip.zipFilesInDir('files/in', 'files/out', options);
```
## Uses

[archiver](https://www.npmjs.com/package/archiver)

