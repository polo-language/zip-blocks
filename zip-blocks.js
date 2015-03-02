module.exports = ZipBlocks;

ZipBlocks.prototype.setCompressionRatio = setCompressionRatio;
ZipBlocks.prototype.zipFilesInDir = zipFilesInDir;

function ZipBlocks() {
  'use strict';
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million
  this._DEFAULT_BLOCK_SIZE = 20;  // = 20 MB for unit of 1 MB
  this._compressionRatio = 1; // built for files with very high compression ratio
  this._RATIO_ERROR_STRING = 'Compression ratio must be between 0.01 and 1, inclusive. Using 1.';

  this._error = function (error) {
    console.error(error); // defualt error handling
  };

  this.on = function (type, callback) {
    if (type === 'error') {
      this._error = callback;
    } else {
      this._error('Handler of type \"' + type + '\" not recognized.');
    }
  };
}

function setCompressionRatio(ratio) {
  if (ratio < 0.01 || 1 < ratio) {
    this._error(this._RATIO_ERROR_STRING);
    return;
  }
  this._compressionRatio = ratio;
}

function zipFilesInDir(inputDir, outputDir, blockSize) {
  'use strict';
  var fs = require('fs')
    , path = require('path')
    , USAGE_STRING = 'Usage: zipFilesInDir(inputDir, [outputDir], [blockSize]).'
    , filesReady = 0
    , zipError = this._error
    , blockSizeUnit = this._BLOCK_SIZE_UNIT
    , compressionRatio = this._compressionRatio;

  if (arguments.length < 1 || 3 < arguments.length) {
    zipError(USAGE_STRING);
    return;
  }

  blockSize = blockSize || this._DEFAULT_BLOCK_SIZE;

  fs.exists(outputDir || '', function (existsOut) { // use empty str if undefined
    if (!existsOut) outputDir = inputDir;
    getListingAndZip();
  });
  
  function getListingAndZip() {
    fs.readdir(inputDir, function (err, listing) {
      var files = {};

      if (err) {
        zipError(err);
        return;
      }
      for (var i = 0; i < listing.length; ++i) {
        runStat(path.join(inputDir, listing[i]));
      }

      function runStat(filePath) {
        fs.stat(filePath, function (err, stats) {
          ++filesReady; // ++ on error too, so zipping proceeds if no throw
          if (err) {
            zipError(err);
            return;
          }
          if (stats.isFile()) {
            files[filePath] = stats.size;
          }
          if (filesReady === listing.length) {
            doZip(getBlocks(files));
          }
        });
      }
    });
  }

  function getBlocks(files) {
    var blocks = []
      , total = 0
      , blockNum = 0
      , max = blockSize * blockSizeUnit * compressionRatio;

    blocks[blockNum] = [];
    for (var key in files) {
      if (files[key] > max) {
        zipError(key + ' is too big for any block - file skipped.');
        continue;
      }
      total += files[key];
      if (total > max) {
        blockNum += 1;
        blocks[blockNum] = [];
        total = files[key];
      }
      blocks[blockNum].push(key);
    }
    return blocks;
  }

  function doZip(blocks) {
    var archiver = require('archiver')
      , zip
      , zipFileName
      , outFile
      , zipNum;

    for (zipNum = 0; zipNum < blocks.length; ++zipNum) {
      zipFileName = path.join(outputDir,
                              path.basename(inputDir) + '_' +
                                  (zipNum + 1).toString() +
                                  '.zip');
      outFile = fs.createWriteStream(zipFileName);
      zip = archiver('zip');
      zip.on('error', zipError);
      zip.pipe(outFile);

      for (var i = 0; i < blocks[zipNum].length; ++i) {
        zip.append(fs.createReadStream(blocks[zipNum][i]),
                   { name: path.basename(blocks[zipNum][i]) });
      }
      zip.finalize();
    }
  }
}
