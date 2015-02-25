describe('zip-blocks constructor', function() {
  'use strict';
  var ZipBlocks = require('../zip-blocks');
  var zip = new ZipBlocks();

  /*beforeEach(function () {
    zip = new ZipBlocks();
  });*/

  it('should initialize block and compression constants', function () {
    expect(zip._BLOCK_SIZE_UNIT).toEqual(1000000);
    expect(zip._DEFAULT_BLOCK_SIZE).toEqual(20);
    expect(zip._compressionRatio).toEqual(1);
  });

});

describe('zip-blocks zipFilesInDir', function() {
  'use strict';
  var ZipBlocks = require('../zip-blocks');
  var zip;

  beforeEach(function () {
    zip = new ZipBlocks();
  });

  it('should have a "zipFilesInDir" method', function () {
    expect(zip.zipFilesInDir).toEqual(jasmine.any(Function));
  });

  it('should accept 1-3 arguments inclusive', function () {
    expect(function () { zip.zipFilesInDir(); }).toThrow();
    expect(function () { zip.zipFilesInDir('1'); }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2'); }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3'); }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3', '4'); }).toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3', '4', '5'); }).toThrow();
  });

  it('should set and call custom callback on error', function () {
    var obj = {
      logError: function (msg) {
        console.log(msg.toString());
      }
    };
    
    spyOn(obj, 'logError').andCallThrough();

    // causes error by having too few arguments:
    expect(function () { zip.zipFilesInDir(); }).toThrow();
    
    zip.on('error', obj.logError);

    // causes error by having too few arguments:
    expect(function () { zip.zipFilesInDir(); }).not.toThrow();
    expect(zip._error === obj.logError).toBeTruthy();
    expect(obj.logError).toHaveBeenCalled();
  });

  /*it('should create a list of files and file sizes', function () {
    var inputPath = '01_test_input_files';
    var outputPath = '02_test_output';

    // how to test ...
  });*/

});
