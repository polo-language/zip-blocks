'use strict';

var Archiver = require('archiver');

module.exports = ZipBlocks;

function ZipBlocks() {}

ZipBlocks.prototype.zipDirectories = {};
ZipBlocks.prototype.zipOneDirectory = function () {
  var args = (function () {
    var _inputPath;
    var _outputDir;

    return {
      get inputPath () { return _inputPath; },
      get outputDir () { return _outputDir; },
    };
  }());
};
