/* global beforeEach, describe, it, expect, spyOn, jasmine */
describe('zip-blocks', function () {
  'use strict';
  describe('constructor', function() {
    var ZipBlocks = require('../zip-blocks');
    var zip = new ZipBlocks();

    it('should initialize block and compression constants', function () {
      expect(zip._BLOCK_SIZE_UNIT).toEqual(1000000);
      expect(zip._blockSize).toEqual(20);
      expect(zip._compressionRatio).toEqual(1);
    });
  });

  describe('zipFilesInDir', function() {
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

    describe('argument handling', function () {
      var errorObj;

      beforeEach(function () {
        errorObj = {
          logError: function () { throw new Error(); }
        };
        zip.on('error', errorObj.logError);
      });

      describe('number of arguments', function () {
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

      describe('argument types', function () {
        it('should work with just an in-path', function () {});
        it('should work with an in-path and out-path', function () {});
        it('should work with an in-path and a block size', function () {});
        it('should work with an in-path, an out-path, and a block size', function () {});
      });
    });
  });
});