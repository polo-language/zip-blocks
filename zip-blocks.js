'use strict';

var Archiver = require('archiver');
var fs = require('fs');
var path = require('path');

module.exports = ZipBlocks;

function ZipBlocks() {
  //this._files = {};
  //this._blocks = [];
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million = 1 MB
  this._COMPRESSION_RATIO = 1; // built for files with very high compression ratio

  // TODO: var onHandlers = ['error'];

  this._errorCallback = function (error) {
    throw new Error(error);
  };

  this.on = function (type, callback) {
    if (type === 'error') {
      this._errorCallback = callback;
    }
  };

}



ZipBlocks.prototype.zipDirectories = {};
ZipBlocks.prototype.zipFilesInDir = function (sourceDir, outputDir /*, blockSize*/) {
  var usageString = 'Usage: node zip_blocks.js path_to_files output_dir [approx_block_size_in_MB]',
      files = {},
      blocks = [];

  if (arguments.length < 1 || 3 < arguments.length) {
    this._errorCallback(usageString);
  }

  if (outputDir === undefined || !fs.existsSync(outputDir)
                              || !fs.statSync(outputDir).isDirectory()) {
    //console.warn('"' + outputDir + '" is not a directory, using input directory instead.');
    outputDir = sourceDir;
  }
  
  fs.readdir(sourceDir, function (err, listing) {
    if (err) {
      this._errorCallback(err);
      return;
    }
    for (var i = 0; i < listing.length; ++i) {
      var fullPath = path.join(sourceDir, listing[i]);
      var stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        files[fullPath] = stat.size;
      }
    }
    //getBlocks();
    //doZip();
  });

  //
};
