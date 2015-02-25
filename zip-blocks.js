var Archiver = require('archiver');
var fs = require('fs');
var path = require('path');

module.exports = ZipBlocks;

function ZipBlocks() {
  'use strict';
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million = 1 MB
  this._compressionRatio = 1; // built for files with very high compression ratio

  this._error = function (error) {
    console.err(error); // defualt error handling
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

ZipBlocks.prototype.zipDirectories = {};
ZipBlocks.prototype.zipFilesInDir = function (sourceDir, outputDir /*, blockSize*/) {
  'use strict';
  var usageString = 'Usage: node zip_blocks.js path_to_files output_dir [approx_block_size_in_MB]'
    , filesReady = 0
    , zipError = this._error;

  if (arguments.length < 1 || 3 < arguments.length) {
    zipError(usageString);
  }

  if (outputDir === undefined || !fs.existsSync(outputDir)
                              || !fs.statSync(outputDir).isDirectory()) {
    outputDir = sourceDir;
    //console.warn('"' + outputDir + '" is not a directory, using input directory instead.');
  }
  
  fs.readdir(sourceDir, function (err, listing) {
    var files = {}
      , fullPath;

    if (err) {
      zipError(err);
      return;
    }
    for (var i = 0; i < listing.length; ++i) {
      // TODO: check out usage of fullPath...
      fullPath = path.join(sourceDir, listing[i]);
      fs.stat(fullPath, fsStatCallback);
    }
    
    function fsStatCallback(err, stats) {
      ++filesReady; // increments on error too, so zipping proceeds if no throw
      if (err) {
        zipError(err);
        return;
      }
      if (stats.isFile()) {
        files[fullPath] = stats.size;
      }
      if (filesReady === listing.length) {
        doZip(getBlocks(files));
      }
    }
  });


  function getBlocks(files) {
    var blocks = {}
      , total = 0,
      , blockNum = 0
      , max = args.blockSize * BLOCK_SIZE_UNIT * COMPRESSION_RATIO;

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
    // TODO
  }
};
