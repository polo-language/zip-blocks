'use strict';
if (process.argv.length < 4 || process.argv.length > 5) {
  console.log('Incorrect arguments supplied.');
  console.log('Usage: node zip_blocks.js path_to_files output_dir [approx_block_size_in_MB]');
  process.exit();
}

// setup and defaults:
var fs = require('fs');
var path = require('path');
var files = {};
var blocks = [];
var blockSizeUnit = 1000000; // million/MB
var compressionRatio = 1; // built for files with very low compression ratio

// parse args:
var pathToFiles = process.argv[2];
var outputDir = process.argv[3];
if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
  console.warn('"' + outputDir + '" is not a directory, using "' + __dirname + '" instead.');
  outputDir = __dirname;
}
var blockSize = 20; // default block size in millions of bytes
if (process.argv.length > 4) {
  var inputBlockSize = parseInt(process.argv[4], 10);
  if (1 <= inputBlockSize  && inputBlockSize <= 100) {
    blockSize = inputBlockSize;
  } else {
    console.warn('Approximate block size must be between 1 and 100 MB inclusive. Using default of 20 MB instead.');
  }
}
var logFileName = path.join(outputDir, getDateTimeDashesOnly() + '.log');
function writeToLog(text) {
  fs.appendFile(logFileName, text + '\n');
}

// sort files into blocks by size:
fs.readdir(pathToFiles, function (err, listing) {
  for (var i = 0; i < listing.length; ++i) {
    var fullPath = path.join(pathToFiles, listing[i]);
    var stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      files[fullPath] = stat.size;
    }
  }
  getBlocks();
  doZip();
});

function getBlocks() {
  var total = 0;
  var max = blockSize * blockSizeUnit * compressionRatio;
  var blockNum = 0;
  blocks[blockNum] = [];
  for (var key in files) {
    if (files[key] > max) {
      writeToLog(key + ' is too big for any block - file skipped.');
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
}

function doZip() {
  var AdmZip = require('adm-zip');
  for (var zipNum = 0; zipNum < blocks.length; ++zipNum) {
    var zip = new AdmZip();
    for (var i = 0; i < blocks[zipNum].length; ++i) {
      try {
        zip.addLocalFile(blocks[zipNum][i]);
      } catch (err) {
        writeToLog('Error zipping ' + blocks[i]);
        continue;
      }
    }
    zip.writeZip(path.join(outputDir, (zipNum + 1).toString() + '.zip'));
  }
}

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
