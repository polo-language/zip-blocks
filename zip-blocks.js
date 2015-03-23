var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , path = require('path')
  , du = require('du')
  , statOver = require('./lib/util/stat-over')

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

  this._onError = function (err) {
    console.error(err) // defualt error handling
  }
}

inherits(ZipBlocks, EventEmitter)

ZipBlocks.prototype.setCompressionRatio = setCompressionRatio
ZipBlocks.prototype.setOptions = setOptions
ZipBlocks.prototype.zipFilesInDir = zipFilesInDir
ZipBlocks.prototype.zipIndividually = zipIndividually

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
    }
  }
}


function handleArgs(args, callback) {
  var that = this
    , inPath = args[0]
    , outPath = args[1]
    , name

  if (!inPath) {
    this.emit('error', new Error('Must specify input directory.'))
    return
  }

  if (typeof args[1] === 'string') {
    if (typeof args[2] === 'object') {
      parseOptions.call(this, args[2])
      if (typeof args[3] === 'string') {
        name = args[3]
      }
    } else if (typeof args[2] === 'string') {
      name = args[2]
    }
  } else {
    outPath = '' // use empty str if undefined so fs.exists doesn't throw
    if (typeof args[1] === 'object') {
      parseOptions.call(this, args[1])
      if (typeof args[2] === 'string') {
        name = args[2]
      }
    }
  }

  fs.exists(outPath, function (existsOut) {
    if (!existsOut) outPath = inPath
    callback.call(that, inPath, outPath, name)
  })
}

function zipFilesInDir() {
  var that = this
    , files = {}

  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath, name) {
    name = name || inPath
    statOver(inPath, onFile, onDir, elseErr, blockAndZip)

    function elseErr(err, callback) {
      that.emit('error', err)
      callback()
    }

    function onFile(filePath, stats, callback) {
      files[filePath] = { isDir: false
                        , size: stats.size
                        }
      callback()
    }

    function onDir(filePath, stat, callback) {
      if (!that._filesOnly) {
        var thisFile = files[filePath] = { isDir: true }
        du(filePath, function (err, size) {
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
      doZip.call(that, getBlocks.call(that, files), outPath, name)
    }
  }
}

function zipIndividually() {
  var that = this
    , files = {}

  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath, name) {
    if (name === inPath) {
      name = undefined
    }
    statOver(inPath, onFile, onDir, elseErr, blockAndZip)

    function elseErr(err, callback) {
      that.emit('error', err)
      callback()
    }

    function onFile(filePath, stats, callback) {
      files[filePath] = { isDir: false }
      callback()
    }

    function onDir(filePath, stat, callback) {
      if (!that._filesOnly) {
        files[filePath] = { isDir: true }
      }
      callback()
    }

    function blockAndZip() {
      doZipKeys.call(that, files, outPath, name)
    }
  }
}

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

function doZip(blocks, outPath, name) {
  var archiver = require('archiver')
    , zip
    , zipFileName
    , outFile
    , thisBlock

  for (var zipNum in blocks) {
    zipFileName = path.join(outPath,
                            path.basename(name) + '_' + zipNum + '.zip')
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

function doZipKeys(toZip, outPath, name) {
  var archiver = require('archiver')
    , zip
    , zipFileName
    , outFile
    , zipNum = 0

  for (var key in toZip) {
    if (name) {
      zipFileName = path.join(outPath,
                              path.basename(name) + '_' + zipNum + '.zip')
      ++zipNum
    } else {
      zipFileName = path.join(outPath, path.basename(key) + '.zip')
    }
    outFile = fs.createWriteStream(zipFileName)
    zip = archiver('zip')
    zip.on('error', this.emit.bind(this, 'error'))
    zip.pipe(outFile)
    if (toZip[key].isDir) {
      zip.directory(key, path.basename(key))
    } else {
      zip.append(fs.createReadStream(key), { name: path.basename(key) })
    }
    zip.finalize()
  }
}
