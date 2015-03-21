# zip-blocks v0.3.1

Interface to zip files in blocks of predetermined maximum size

## Install

```bash
npm install zip-blocks --save
```
## zip-blocks

### Methods

#### zipFilesInDir(inputDir, [outputDir], [options])

Adds all files at the root of `inputDir` to a set of zip archives. Each of the archives produced is smaller than or equal to the `blockSize` specified in `options`. (The original motivation was to zip a set of files into archives that can be individually sent as email attachments.) If no `outputDir` is provided, zip files are written to `inputDir`. 

#### setOptions(options)

`options` is an object containing keys from among the following (default values are given):
```js
{
  blockSize: 20, // in MB
  compressionRatio: 1,
  filesOnly: true,
  addOversize: true,
  name: undefined
}
```

If `filesOnly` is set to false, directories are included in the operation as well. If `addOversize` is left at `true`, individual files/directories exceeding the maximum block size will be added to individual archives; for `false`, they will be skipped and an error event emitted listing oversized items. `name` is used as the base name for generated files (defaults are set by individual methods as necessary).

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
