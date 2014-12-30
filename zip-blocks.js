'use strict';

var Archiver = require('archiver');
var fs = require('fs');
var path = require('path');

module.exports = ZipBlocks;

function ZipBlocks() {
  this._files = {};
  this._blocks = [];
  this._BLOCK_SIZE_UNIT = 1000000; // = 1 million = 1 MB
  this._COMPRESSION_RATIO = 1; // built for files with very high compression ratio

  // TODO: var onHandlers = ['error'];

  this._errorCallback = function (error) {
    throw new Error(error);
  };

  this.on = function (type, callback) {
    if (type === 'error') {
      errorCallback = callback;
    }
  };

};



ZipBlocks.prototype.zipDirectories = {};
ZipBlocks.prototype.zipFilesInDir = function (inputDir, outputDir, blockSize) {
  var usageString = 'Usage: node zip_blocks.js path_to_files output_dir [approx_block_size_in_MB]';
  if (arguments.length < 1 || 3 < arguments.length) {
    this._errorCallback(usageString);
  }

  if (outputDir === undefined || !fs.existsSync(outputDir)
                              || !fs.statSync(outputDir).isDirectory()) {
    //console.warn('"' + outputDir + '" is not a directory, using input directory instead.');
    outputDir = inputDir;
  }
  
  
  // replace with on('error') listener:
  /*var _logFileName = path.join(outputDir, getDateTimeDashesOnly() + '.log');
  function writeLineToLog(text) {
    fs.appendFile(_logFileName, text + '\n');
  }*/
};

function getDateTimeDashesOnly() {
    var now     = new Date(); 
    var year    = now.getFullYear();
    var month   = now.getMonth() + 1; 
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds(); 
    if (month.toString().length === 1)
        month = '0' + month;
    if (day.toString().length === 1)
        day = '0' + day;
    if (hour.toString().length === 1)
        hour = '0' + hour;
    if (minute.toString().length === 1)
        minute = '0' + minute;
    if (second.toString().length === 1)
        second = '0' + second;
    return year + '-' + month + '-' + day + '_' + hour + '-' + minute + '-' + second;   
}
