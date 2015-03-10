# zip-blocks v0.2.2

Interface to zip files in blocks of predetermined maximum size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, [outputDir], [options])

Creates zip archives of all files at the root of `inputDir`, grouping files into blocks of less than or equal to the specified `blockSize`. If no `outputDir` is provided, zip files are written to `inputDir`. If `filesOnly` is set to false, directories at the root of `inputDir` will be included as well. If `addOversize` is left at `true`, individual files/directories exceeding the maximum block size will be added to individual archives; for `false`, they will be skipped and an error event emitted.

Options is an object which can contain keys from among the following (default values are given):
```js
{
  blockSize: 20, // in MB
  compressionRatio: 1,
  filesOnly: true,
  addOversize: true
}
```

#### setCompressionRatio(ratio)

Sets the assumed compression ratio to the provided value (from 0.01 to 1, inclusive). The assumed compression ratio is used to determine the maximum number of files per block. The default is 1 (equivalent to no compression). Note that setting the compression ratio does not affect the actual zip compression performance.


### Events

Extends events.EventEmitter. Set an error callback with `on(event, callback)`. Note that multiple errors may fire during processesing. The default error handler prints a stack trace and continues.


## Example

```js
var ZipBlocks = require('zip-blocks')
  , zipB = new ZipBlocks()
  , options = {
      blockSize: 2,     // in MB
      filesOnly: false  // include directories
    };

zipB.on('error', function (err) { /* handdle error */ });

zipB.zipFilesInDir('files/in', 'files/out', options);
```
## Uses

[archiver](https://www.npmjs.com/package/archiver)

