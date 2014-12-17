'use strict';
if (process.argv.length < 4 || process.argv.length > 5) {
  console.log('Usage: node zip_blocks.js path_to_files output_zip [approx_block_size_in_MB]');
  throw new FatalError('Incorrect arguments supplied.');
}

// setup and defaults:
var blockSize = 20; // magic number defaults
var fs = require('fs');
var path = require('path');
var files = {};
var blocks = [];

// parse args:
var pathToFiles = process.argv[2];
var outputZip = process.argv[3];
if (process.argv.length > 4) {
  var inputBlockSize = Number.parseInt(process.argv[4], 10);
  // TODO: test if we get a 'reasonable' number
  blockSize = inputBlockSize;
}
var outputDir = path.dirname(outputZip);
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
  testPrint();
  //getBlocks();
  //doZip();
});

function testPrint() {
  for (var key in files) {
    writeToLog(key + ': ' + files[key]);
  }
}

function getBlocks() {}

function doZip() {
  var AdmZip = require('adm-zip');
  var zip = new AdmZip();
    try {
    //zip.addLocalFile
  } catch (err) {
    writeToLog(err);
  }
  zip.writeZip(outputZip);
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

// notes:
//zip.addLocalFile('file_on_disk', 'path_in_archive');
//zip.addLocalFolder('path_on_disk', 'path_in_archive');

    /* async version:
    fs.stat(listing[i], function (err, stat) {
      if (err) {
        writeToLog(err);
        return;
      }
      if (stat.isFile()) {
        files[listing] = stat.size;
      }
    });*/
