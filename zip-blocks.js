var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , path = require('path')
  , du = require('du')
  , statOver = require('./stat-over')

var ZipBlocksFactory = module.exports = function () {
  var zipBlocks = new ZipBlocks()
  zipBlocks.on('error', zipBlocks._onError)
  zipBlocks.on('newListener', syncErrorListener.bind(zipBlocks))
  return zipBlocks
}

function ZipBlocks() {
  'use strict'
  this._BLOCK_SIZE_UNIT = 1000000  // = 1 million
  this._blockSize = 20             // = 20 MB for unit of 1 MB
  this._compressionRatio = 1       // for files with high compression ratio
  this._filesOnly = true
  this._addOversize = true
  this._name = undefined

  this._onError = function (err) {
    console.error(err.stack) // defualt error handling
  }
}

inherits(ZipBlocks, EventEmitter)

ZipBlocks.prototype.setCompressionRatio = setCompressionRatio
ZipBlocks.prototype.setOptions = setOptions
ZipBlocks.prototype.zipFilesInDir = zipFilesInDir

function  syncErrorListener(event, listener) {
  if (event === 'error') {
    this.removeListener('error', this._onError)
    this._onError = listener
  }
}

function setCompressionRatio(ratio) {
  var _RATIO_ERROR_STRING = 'Compression ratio must be between 0.01 and 1, inclusive. Using 1.'
  if (ratio < 0.01 || 1 < ratio) {
    this.emit('error', new Error(_RATIO_ERROR_STRING))
    return
  }
  this._compressionRatio = ratio
}

function setOptions(options) {
  parseOptions.call(this, options)
}

function parseOptions(options) {
  for (var key in options) {
    switch (key) {
    case 'blockSize':
      this._blockSize = options[key]
      break
    case 'compressionRatio':
      setCompressionRatio.call(this, options[key])
      break
    case 'filesOnly':
      this._filesOnly = options[key]
      break
    case 'addOversize':
      this._addOversize = options[key]
      break
    case 'name':
      this._name = options[key]
      break
    }
  }
}

function zipFilesInDir() {
  var that = this
    , files = {}

  if (arguments.length < 1 || 3 < arguments.length) {
    this.emit('error', new Error('Usage: zipFilesInDir(inputDir, [outputDir], [options]).'))
    return
  }
  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath) {
    statOver(inPath, onFile, onDir, elseErr, blockAndZip)

    function elseErr(err, callback) {
      that.emit('error', err)
      callback()
    }

    function onFile(filePath, stats, callback) {
      files[filePath] = {}
      files[filePath].isDir = false
      files[filePath].size = stats.size
      callback()
    }

    function onDir(filePath, stat, callback) {
      if (!that._filesOnly) {
        var thisFile = files[filePath] = {}
        thisFile.isDir = true
        du(filePath, function (err, size) {
DEBUG:          console.log('test: ' +filePath)
          if (err) {
            that.emit('error', err)
          } else {
            thisFile.size = size
          }
          callback()
        })
      } else {
        callback()
      }
    }

    function blockAndZip() {
      doZip.call(that, getBlocks.call(that, files), outPath)
    }
  }
}

function handleArgs(args, callback) {
  var inPath = args[0]
    , outPath = args[1]
    , that = this

  if (typeof args[1] === 'string') {
    if (typeof args[2] === 'object') {
      parseOptions.call(this, args[2])
    }
  } else {
    outPath = '' // use empty str if undefined so fs.exists doesn't throw

    if (typeof args[1] === 'object') {
      parseOptions.call(this, args[1])
    }
  }

  this._name = this._name || inPath

  fs.exists(outPath, function (existsOut) {
    if (!existsOut) outPath = inPath
    callback.call(that, inPath, outPath)
  })
}

/*function getListingAndZip(inPath, outPath) {
  var thisZB = this
    , filesReady = 0

  fs.readdir(inPath, function (err, listing) {
    var files = {}

    if (err) {
      thisZB.emit('error', err)
      return
    }
    for (var item in listing) {
      runStat(path.join(inPath, listing[item]))
    }

    function runStat(filePath) {
      fs.stat(filePath, function (err, stats) {
        var thisFile
        
        if (err) {
          thisZB.emit('error', err)
          checkAllStatsCollected()
          return
        }

        if (stats.isDirectory()) {
          if (!thisZB._filesOnly) {
            thisFile = files[filePath] = {}
            thisFile.isDir = true
            setDirSize(filePath, thisFile)
          } else {
            checkAllStatsCollected()
          }
        } else if (stats.isFile()) {
          thisFile = files[filePath] = {}
          thisFile.isDir = false
          thisFile.size = stats.size
          checkAllStatsCollected()
        }
      })

      function setDirSize(dir, objWithSizeField) {
        du(dir, function (err, size) {
          if (err) {
            thisZB.emit('error', err)
          } else {
            objWithSizeField.size = size
          }
          checkAllStatsCollected()
        })
      }

      function checkAllStatsCollected() {
        ++filesReady
        if (filesReady === listing.length) {
          doZip.call(thisZB, getBlocks.call(thisZB, files), outPath)
        }
      }
    }
  })
}*/

function getBlocks(files) {
  var blocks
    , max = this._blockSize * this._BLOCK_SIZE_UNIT / this._compressionRatio
    , bp = require('bin-packer')
    , oversized
  
  if (this._addOversize) {
    return bp.firstFitDecreasing(files, 'size', max, true)
  } else {
    blocks = bp.firstFitDecreasing(files, 'size', max, false)
    oversized = blocks.pop()
    this.emit('error', new Error('Oversized: ' + JSON.stringify(oversized)))
    return blocks
  }
}

function doZip(blocks, outPath) {
  var archiver = require('archiver')
    , zip
    , zipFileName
    , outFile
    , thisBlock

  for (var zipNum in blocks) {
    zipFileName = path.join(outPath,
                            path.basename(this._name) + '_' + zipNum + '.zip')
    outFile = fs.createWriteStream(zipFileName)
    zip = archiver('zip')
    zip.on('error', this.emit.bind(this, 'error'))
    zip.pipe(outFile)

    thisBlock = blocks[zipNum]
    for (var key in thisBlock) {
      if (thisBlock[key].isDir) {
        zip.directory(key, path.basename(key))
      } else {
        zip.append(fs.createReadStream(key), { name: path.basename(key) })
      }
    }
    zip.finalize()
  }
}
