var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter;

var ZipBlocksFactory = module.exports = function () {
  var zipBlocks = new ZipBlocks();
  zipBlocks.on('error', zipBlocks._onError);
  zipBlocks.on('newListener', syncErrorListener.bind(zipBlocks));
  return zipBlocks;
};

function ZipBlocks() {
  'use strict';
  this._BLOCK_SIZE_UNIT = 1000000;  // = 1 million
  this._blockSize = 20;             // = 20 MB for unit of 1 MB
  this._compressionRatio = 1;       // for files with high compression ratio
  this._filesOnly = true;
  this._addOversize = true;

  this._onError = function (err) {
    console.error(err.stack); // defualt error handling
  };
}

inherits(ZipBlocks, EventEmitter);

ZipBlocks.prototype.setCompressionRatio = setCompressionRatio;
ZipBlocks.prototype.setOptions = setOptions;
ZipBlocks.prototype.zipFilesInDir = zipFilesInDir;

function  syncErrorListener(event, listener) {
  if (event === 'error') {
    this.removeListener('error', this._onError);
    this._onError = listener;
  }
}

function setCompressionRatio(ratio) {
  var _RATIO_ERROR_STRING = 'Compression ratio must be between 0.01 and 1, inclusive. Using 1.';
  if (ratio < 0.01 || 1 < ratio) {
    this.emit('error', new Error(_RATIO_ERROR_STRING));
    return;
  }
  this._compressionRatio = ratio;
}

function setOptions(options) {
  parseOptions.call(this, options);
}

function parseOptions(options) {
  for (var key in options) {
    switch (key) {
    case 'blockSize':
      this._blockSize = options[key];
      break;
    case 'compressionRatio':
      setCompressionRatio.call(this, options[key])
      break;
    case 'filesOnly':
      this._filesOnly = options[key];
      break;
    case 'addOversize':
      this._addOversize = options[key];
    }
  }
}

function zipFilesInDir(inputDir, outputDir, options) {
  'use strict';
  var fs = require('fs')
    , path = require('path')
    , USAGE_STRING = 'Usage: zipFilesInDir(inputDir, [outputDir], [options]).'
    , filesReady = 0
    , thisZB = this;

  if (arguments.length < 1 || 3 < arguments.length) {
    thisZB.emit('error', new Error(USAGE_STRING));
    return;
  }

  if (typeof outputDir === 'string') {
    if (typeof options === 'object') {
      parseOptions.call(this, options);
    }
  } else {
    outputDir = ''; // use empty str if undefined so fs.exists doesn't throw

    if (typeof outputDir === 'object') {
      parseOptions.call(this, outputDir);
    }
  }

  fs.exists(outputDir, function (existsOut) {
    if (!existsOut) outputDir = inputDir;
    getListingAndZip();
  });

  function getListingAndZip() {
    var du = require('du');

    fs.readdir(inputDir, function (err, listing) {
      var files = {};

      if (err) {
        thisZB.emit('error', err);
        return;
      }
      for (var item in listing) {
        runStat(path.join(inputDir, listing[item]));
      }

      function runStat(filePath) {
        fs.stat(filePath, function (err, stats) {
          var thisFile;
          
          if (err) {
            thisZB.emit('error', err);
            checkAllStatsCollected();
            return;
          }

          if (stats.isDirectory()) {
            if (!thisZB._filesOnly) {
              thisFile = files[filePath] = {};
              thisFile.isDir = true;
              setDirSize(filePath, thisFile);
            } else {
              checkAllStatsCollected();
            }
          } else if (stats.isFile()) {
            thisFile = files[filePath] = {};
            thisFile.isDir = false;
            thisFile.size = stats.size;
            checkAllStatsCollected();
          }
        });

        function setDirSize(dir, objWithSizeField) {
          du(dir, function (err, size) {
            if (err) {
              thisZB.emit('error', err);
            } else {
              objWithSizeField.size = size;
            }
            checkAllStatsCollected();
          });
        }

        function checkAllStatsCollected() {
          ++filesReady;
          if (filesReady === listing.length) {
            doZip(getBlocks(files));
          }
        }
      }
    });
  }

  function getBlocks(files) {
    var blocks
      , max = thisZB._blockSize * thisZB._BLOCK_SIZE_UNIT / thisZB._compressionRatio
      , bp = require('bin-packer');
    
    if (thisZB._addOversize) {
      return bp.firstFitDecreasing(files, 'size', max, true);
    } else {
      blocks = bp.firstFitDecreasing(files, 'size', max, false);
      blocks.pop();  // remove last cell in array with all oversized
      // TODO: emit error with oversized
      return blocks;
    }
  }

  function doZip(blocks) {
    var archiver = require('archiver')
      , zip
      , zipFileName
      , outFile
      , thisBlock;

    for (var zipNum in blocks) {
      zipFileName = path.join(outputDir,
                              path.basename(inputDir) + '_' + zipNum + '.zip');
      outFile = fs.createWriteStream(zipFileName);
      zip = archiver('zip');
      zip.on('error', thisZB.emit.bind(thisZB, 'error'));
      zip.pipe(outFile);

      thisBlock = blocks[zipNum];
      for (var key in thisBlock) {
        if (thisBlock[key].isDir) {
          zip.directory(key, path.basename(key));
        } else {
          zip.append(fs.createReadStream(key), { name: path.basename(key) });
        }
      }
      zip.finalize();
    }
  }
}
