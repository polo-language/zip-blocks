var fs = require('fs');
var path = require('path');

module.exports = ZipBlocks;

function ZipBlocks() {
  'use strict';
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million
  this._DEFAULT_BLOCK_SIZE = 20;  // = 20 MB for unit of 1 MB
  this._compressionRatio = 1; // built for files with very high compression ratio

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

  this.setCompressionRatio = function(ratio) {
    if (ratio < 0.01 || 1 < ratio) {
      this._error('Compression ratio must be between 0.01 and 1, inclusive. Using 1.');
      return;
    }
    this._compressionRatio = ratio;
  };
}

// TODO: ZipBlocks.prototype.zipDirectories = {};

// zip each file in a given directory in it's own zip file
// TODO: ZipBlocks.prototype.zipEachFileInDir = funtion (sourceDir, outputDir) {};

ZipBlocks.prototype.zipFilesInDir = function (sourceDir, outputDir, blockSize) {
  'use strict';
  var usageString = 'Usage: zipFilesInDir(sourceDir, [outputDir], [blockSize]).'
    , filesReady = 0
    , zipError = this._error
    , blockSizeUnit = this._BLOCK_SIZE_UNIT
    , compressionRatio = this._compressionRatio;

  if (arguments.length < 1 || 3 < arguments.length) {
    zipError(usageString);
    return;
  }

  blockSize = blockSize || this._DEFAULT_BLOCK_SIZE;

  fs.exists(outputDir || '', function (exists) { // if outputDir undefined, use empty string
    if (!exists) outputDir = sourceDir;
    getListingAndZip();
  });
  
  function getListingAndZip() {
    fs.readdir(sourceDir, function (err, listing) {
      var files = {};

      if (err) {
        zipError(err);
        return;
      }
      for (var i = 0; i < listing.length; ++i) {
        runStat(path.join(sourceDir, listing[i]));
      }

      function runStat(path) {
        fs.stat(path, function (err, stats) {
          ++filesReady; // increments on error too, so zipping proceeds if no throw
          if (err) {
            zipError(err);
            return;
          }
          if (stats.isFile()) {
            files[path] = stats.size;
          }
          if (filesReady === listing.length) {
            doZip(getBlocks(files));
          }
        });
      }
    });
  }

  function getBlocks(files) {
    var blocks = {}
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

  function doZip(/*blocks*/) {
    // TODO
    console.log('**********************\ndoZip');
  }
};
