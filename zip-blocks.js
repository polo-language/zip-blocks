var Archiver = require('archiver');
var fs = require('fs');
var path = require('path');

module.exports = ZipBlocks;

function ZipBlocks() {
  'use strict';
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million = 1 MB
  this._compressionRatio = 1; // built for files with very high compression ratio

  this._error = function (error) {
    throw new Error(error);
  };

  this.on = function (type, callback) {
    if (type === 'error') {
      this._error = callback;
    } else {
      throw 'Handler of type \"' + type + '\" not recognized.';
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
  var usageString = 'Usage: node zip_blocks.js path_to_files output_dir [approx_block_size_in_MB]',
      files = {},
      //blocks = [],
      filesReady = 0,
      zipError = this._error;

  if (arguments.length < 1 || 3 < arguments.length) {
    zipError(usageString);
  }

  if (outputDir === undefined || !fs.existsSync(outputDir)
                              || !fs.statSync(outputDir).isDirectory()) {
    //console.warn('"' + outputDir + '" is not a directory, using input directory instead.');
    outputDir = sourceDir;
  }
  
  fs.readdir(sourceDir, function (err, listing) {
    if (err) {
      zipError(err);
      return;
    }
    for (var i = 0; i < listing.length; ++i) {
      var fullPath = path.join(sourceDir, listing[i]);
      fs.stat(fullPath, fsStatCallback);
    }
    
    function fsStatCallback(err, stats) {
      ++filesReady; // increments on error as well so zipping proceeds
      if (err) {
        zipError(err);
        return;
      }
      if (stats.isFile()) {
        files[fullPath] = stats.size;
      }
      if (filesReady === listing.length) {
        getBlocks();
        doZip();
      }
    }
  });


  function getBlocks() {
    console.log('getBlocks called.');
  }
  function doZip() {}
};
