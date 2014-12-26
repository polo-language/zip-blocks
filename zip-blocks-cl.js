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
var BLOCK_SIZE_UNIT = 1000000; // million/MB
var COMPRESSION_RATIO = 1; // built for files with very low compression ratio

var args = (function () {
  var _pathToFiles = process.argv[2],
      _outputDir = process.argv[3],
      _blockSize = 20, // default block size in millions of bytes
      _logFileName;

  if (!fs.existsSync(_outputDir) || !fs.statSync(_outputDir).isDirectory()) {
    console.warn('"' + _outputDir + '" is not a directory, using "' + __dirname + '" instead.');
    _outputDir = __dirname;
  }
  _logFileName = path.join(_outputDir, getDateTimeDashesOnly() + '.log');

  if (process.argv.length > 4) {
    var inputBlockSize = parseInt(process.argv[4], 10);
    if (1 <= inputBlockSize  && inputBlockSize <= 100) {
      _blockSize = inputBlockSize;
    }
    else {
      console.warn('Approximate block size must be an integer between 1 and 100 MB, inclusive. Using default of 20 MB instead.');
    }
  }

  return {
    get pathToFiles () { return _pathToFiles; },
    get outputDir () { return _outputDir; },
    get blockSize () { return _blockSize; },
    get logFileName () { return _logFileName; },
  };
}());

function writeLineToLog(text) {
  fs.appendFile(args.logFileName, text + '\n');
}

// sort files into blocks by size:
fs.readdir(args.pathToFiles, function (err, listing) {
  for (var i = 0; i < listing.length; ++i) {
    var fullPath = path.join(args.pathToFiles, listing[i]);
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
  var max = args.blockSize * BLOCK_SIZE_UNIT * COMPRESSION_RATIO;
  var blockNum = 0;
  blocks[blockNum] = [];
  for (var key in files) {
    if (files[key] > max) {
      writeLineToLog(key + ' is too big for any block - file skipped.');
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
  var archiver = require('archiver');
  for (var zipNum = 0; zipNum < blocks.length; ++zipNum) {
    var fileName = path.join(args.outputDir, (zipNum + 1).toString() + '.zip');
    var outFile = fs.createWriteStream(fileName);
    var zip = archiver('zip');
    zip.on('error', function (err) { writeLineToLog(err); });
    zip.pipe(outFile);

    for (var i = 0; i < blocks[zipNum].length; ++i) {
      zip.append(fs.createReadStream(blocks[zipNum][i]), { name: path.basename(blocks[zipNum][i]) });
    }
    zip.finalize();
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
