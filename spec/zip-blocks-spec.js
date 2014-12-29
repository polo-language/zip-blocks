describe('zip-blocks constructor', function() {
  var ZipBlocks = require('../zip-blocks');
  var zip = new ZipBlocks();

  /*beforeEach(function () {
    zip = new ZipBlocks();
  });*/

  it('should initialize empty files and blocks', function () {
    expect(zip._files).toEqual([]);
    expect(zip._blocks).toEqual({});
  });

  it('should initialize block and compression constants', function () {
    expect(zip._BLOCK_SIZE_UNIT).toEqual(1000000);
    expect(zip._COMPRESSION_RATIO).toEqual(1);
  });

});

describe('zip-blocks zipFilesInDir', function() {
  var ZipBlocks = require('../zip-blocks');
  var zip = new ZipBlocks();

  /*beforeEach(function () {
    zip = new ZipBlocks();
  });*/

  it('should have a "zipFilesInDir" method', function () {
    expect(zip.zipFilesInDir).toEqual(jasmine.any(Function));
  });

  it('should accept 1-3 arguments inclusive', function () {
    expect(function () { zip.zipFilesInDir() }).toThrow();
    expect(function () { zip.zipFilesInDir('1') }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2') }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3') }).not.toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3', '4') }).toThrow();
    expect(function () { zip.zipFilesInDir('1', '2', '3', '4', '5') }).toThrow();
  });

  // tests for on('error') listener
});
