describe('zip-blocks zipOneDirectory', function() {
  var ZipBlocks = require('../zip-blocks');
  var zip = new ZipBlocks();

  /*beforeEach(function () {
    zip = new ZipBlocks();
  });*/

  it('should have a "zipOneDirectory" method', function () {
    expect(zip.zipOneDirectory).toEqual(jasmine.any(Function));
  });

  it('should create an args object', function () {
    expect(zip.zipOneDirectory.args).toBeDefined();
  });

  it('should create an output path string', function () {
    expect(zip.zipOneDirectory.args.outputDir).toBeDefined();
  });


});
