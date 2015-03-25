# zip-blocks v0.4.1

Interface to zip files in blocks of predetermined maximum size


## Install

```bash
npm install zip-blocks --save
```


## zip-blocks

### Constructor

Pass an object to the constructor to specify settings. See example below.

The settings object can contain keys from among the following (default values are given):
```js
{
  blockSize: 20,        // in MB
  compressionRatio: 1,  // no compression
  filesOnly: true,
  addOversize: true
}
```

- `filesOnly`: If set to false, directories are included in the operation as well.
- `addOversize`: If left at `true`, individual files/directories exceeding the maximum block size will be added to individual archives; for `false`, they will be skipped and an error event emitted listing oversized items. 
- `compressionRatio`: If the string `'exact'` is provided for `ratio`, the sizes of the compressed files will be calculated (by zipping them into a temporary folder). Note that this is only available for `filesOnly` set to `true`, and will approximately double the duration of the operation. Otherwise, `ratio` should be a value from 0.01 to 1, inclusive, and is used to estimate the compressibility of the files when determining the maximum number of files per block. The default is `1`, which is equivalent to no compression (e.g. for PNG, MP3, etc.). Note that setting the compression ratio to a numeric value will not affect the actual zip compression performance.

### Methods

#### zipFilesInDir(inputDir, [outputDir], [name], [callback])

Adds all files at the root of `inputDir` to a set of zip archives. Each of the archives produced is smaller than or equal to the `blockSize` setting. (The original motivation was to zip a set of files into archives that can be individually sent as email attachments.) If no `outputDir` is provided, zip files are written to `inputDir`. `name` is used as the base name for the generated archives. `callback` does not receive any arguments.

#### zipIndividually(inputDir, [outputDir], [name], [callback])

Adds each file in `inputDir` to its own zip archive. If no `outputDir` is provided, zip files are written to `inputDir`. If `name` is omitted, the original filenames are used for the archives. `filesOnly` is the only applicable key in `options`. `callback` does not receive any arguments.

### Events

Extends events.EventEmitter. Set an error callback with `on(event, callback)`. The default error handler prints the error message and continues.


## Example

```js
var ZipBlocks = require('zip-blocks')
  , options = { blockSize: 2      // in MB
              , filesOnly: false  // include directories
              }
  , zip = new ZipBlocks(options)

zip.on('error', function (err) { /* handdle error */ })

zip.zipFilesInDir('files/in', 'files/out', 'output_name')

zip.zipIndividually('files/in', 'files/out')
```
