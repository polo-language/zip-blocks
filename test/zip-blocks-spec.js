/* global beforeEach, describe, it, expect */
var inPath = './test_files/in/01'
  , outPath = './test_files/out';

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

  it('should set and call custom callback on error', function () {
    var errorObj = {
      logError: function (msg) {
        console.log('Custom error: ' + msg.toString());
      }
    };
    spyOn(errorObj, 'logError').andCallThrough();
    zip.on('error', errorObj.logError);

    // intentionally cause an error by having too few arguments:
    zip.zipFilesInDir();

    expect(zip._error === errorObj.logError).toBeTruthy();
    expect(errorObj.logError).toHaveBeenCalled();
  });

  describe('number of arguments accepted', function () {
    var errorObj;

    beforeEach(function () {
      errorObj = {
        logError: function () { throw new Error(); }
      };
      zip.on('error', errorObj.logError);
    });

    it('should not accept 0 arguments', function () {
      expect(function () { zip.zipFilesInDir(); }).toThrow();
    });
    it('should accept 1 argument', function () {
      expect(function () { zip.zipFilesInDir('inPath'); }).not.toThrow();
    });
    it('should accept 2 arguments', function () {
      expect(function () { zip.zipFilesInDir('inPath', 'outPath'); }).not.toThrow();
    });
    it('should accept 3 arguments', function () {
      expect(function () { zip.zipFilesInDir('inPath', 'outPath', '3'); }).not.toThrow();
    });
    it('should not accept 4 arguments', function () {
      expect(function () { zip.zipFilesInDir('inPath', 'outPath', '3', '4'); }).toThrow();
    });
    it('should not accept 5 arguments', function () {
      expect(function () { zip.zipFilesInDir('inPath', 'outPath', '3', '4', '5'); }).toThrow();
    });
  });
});
