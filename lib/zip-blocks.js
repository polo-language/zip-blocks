var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , path = require('path')
  , archiver = require('archiver')
  , du = require('du')
  , binPacker = require('bin-packer')
  , statOver = require('./util/stat-over')
  , strings = require('./res/strings')

module.exports = function (options) {
  var zipBlocks = new ZipBlocks(options)
  zipBlocks.on('error', zipBlocks._onError)
  zipBlocks.on('newListener', syncErrorListener.bind(zipBlocks))
  parseOptions.call(zipBlocks, options)
  return zipBlocks
}

function ZipBlocks() {
  this._BLOCK_SIZE_UNIT = 1000000  // = 1 million
  this._blockSize = 20             // = 20 MB for unit of 1 MB
  this._compressionRatio = 1       // for files with high compression ratio
  this._exact = false
  this._filesOnly = true
  this._addOversize = true
  this._ext = strings.EXTENSION_ZIP

  this._onError = function (err) {
    console.error(err) // defualt error handling
  }
}

inherits(ZipBlocks, EventEmitter)

ZipBlocks.prototype.zipFilesInDir = zipFilesInDir
ZipBlocks.prototype.zipIndividually = zipIndividually

function syncErrorListener(event, listener) {
  if (event === 'error') {
    this.removeListener('error', this._onError)
    this._onError = listener
  }
}

function setCompressionRatio(ratio) {
  if (ratio === 'exact') {
    this._exact = true
    return
  }
  if (ratio < 0.01 || 1 < ratio) {
    this.emit('error', new Error(strings.RATIO_ERROR_STRING))
    return
  }
  this._compressionRatio = ratio
}

function parseOptions(options) {
  if (typeof options !== 'object') {
    return
  }
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


function handleArgs(args, action) {
  var that = this
    , inPath = args[0]
    , outPath = args[1]
    , name
    , callback

  if (!inPath) {
    this.emit('error', new Error(strings.ERROR_INPUT_DIR))
    return
  }

  if (typeof args[1] === 'string') {
    if (typeof args[2] === 'string') {
      name = args[2]
    }
  } else {
    outPath = '' // use empty str if undefined so fs.exists doesn't throw
  }

  if (typeof args[args.length - 1] === 'function') {
    callback = args[args.length - 1]
  } else {
    callback = function () {}
  }

  fs.exists(outPath, function (existsOut) {
    if (!existsOut) outPath = inPath
    action.call(that, inPath, outPath, name, callback)
  })
}

function zipFilesInDir() {
  var that = this
    , files = {}

  handleArgs.call(this, arguments, function (inPath, outPath, name, callback) {
    if (this._exact) {
      discoverZip.call(this, inPath, outPath, name, callback)
    } else {
      listAndZip.call(this, inPath, outPath, name, callback)
    }
  })

  function listAndZip(inPath, outPath, name, callback) {
    name = name || inPath
    statOver(inPath, onFile, onDir, elseErr.bind(that), blockAndZip)

    function onFile(filePath, stats, statOverCB) {
      files[filePath] = { isDir: false
                        , size: stats.size
                        }
      statOverCB()
    }

    function onDir(filePath, stat, statOverCB) {
      if (!that._filesOnly) {
        var thisFile = files[filePath] = { isDir: true }
        du(filePath, function (err, size) {
          if (err) {
            that.emit('error', err)
          } else {
            thisFile.size = size
          }
          statOverCB()
        })
      } else {
        statOverCB()
      }
    }

    function blockAndZip() {
      doZip.call(that, getBlocks.call(that, files), outPath, name, callback)
    }
  }
}

function zipIndividually() {
  var that = this

  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath, name, callback) {
    var files = {}
    statOver(inPath, onFile, onDir, elseErr.bind(that), blockAndZip)

    function onFile(filePath, stats, statOverCB) {
      files[filePath] = { isDir: false }
      statOverCB()
    }

    function onDir(filePath, stat, statOverCB) {
      if (!that._filesOnly) {
        files[filePath] = { isDir: true }
      }
      statOverCB()
    }

    function blockAndZip() {
      doZipKeys.call(that, files, outPath, name, callback)
    }
  }
}

function discoverZip(inPath, outPath, name, callback) {
  var that = this
    , tempDirPath = path.join(outPath,
                              Math.floor(Math.random()*10000000) +
                              strings.SEPARATOR_OUT_NAME + Date.now())

  if (!this._filesOnly) {
    this.emit('error', new Error(strings.ERROR_EXACT_FILESONLY))
    return
  }

  fs.mkdir(tempDirPath, function (err) {
    if (err) {
      that.emit('error', err)
      return
    }
    that.zipIndividually(inPath, tempDirPath, statTemps)
  })

  function statTemps() {
    var files = {}
      , extLength = that._ext.length

    statOver(tempDirPath, onFile, onDir, elseErr.bind(that), rmTempAndZip)

    function onFile(filePath, stats, statOverCB) {
      var baseName = path.basename(filePath)
        , originalPath = path.join(inPath,
                                   baseName.substring(0, baseName.length - extLength))
      files[originalPath] = { size: stats.size
                            , isDir: false
                            }
      fs.unlink(filePath, statOverCB)
    }

    function onDir(filePath, stats, statOverCB) {
      // won't get here: all inputs are archive files, no dirs
      statOverCB()
    }

    function rmTempAndZip() {
      doZip.call(that, getBlocks.call(that, files), outPath, name, wrappedCB)
    }
  }

  function wrappedCB() {
    try {
      fs.rmdir(tempDirPath, function (err) {
        if (err) that.emit('error', err)
      })
    } catch (err) {
      that.emit('error', err)
    }
    callback()
  }
}

function elseErr(err, callback) {
  this.emit('error', err)
  callback()
}

function getBlocks(files) {
  var blocks
    , max = this._blockSize * this._BLOCK_SIZE_UNIT / this._compressionRatio
    , oversized
  
  if (this._addOversize) {
    return binPacker.firstFitDecreasing(files, 'size', max, true)
  } else {
    blocks = binPacker.firstFitDecreasing(files, 'size', max, false)
    oversized = blocks.pop()
    if (Object.keys(oversized).length !== 0) {
      this.emit('error', new Error(strings.ERROR_OVERSIZED + JSON.stringify(oversized)))
    }
    return blocks
  }
}

function doZip(blocks, outPath, name, callback) {
  var zip
    , zipFileName
    , outFile
    , thisBlock
    , checkFinished = getCheckFinished(blocks.length, callback)

  for (var zipNum in blocks) {
    zipFileName = path.join(outPath,
                            path.basename(name) + strings.SEPARATOR_OUT_NAME +
                              zipNum + strings.EXTENSION_ZIP)
    outFile = fs.createWriteStream(zipFileName)
    zip = archiver('zip')
    zip.on('error', this.emit.bind(this, 'error'))
    zip.on('finish', checkFinished)
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

function doZipKeys(toZip, outPath, name, callback) {
  var zip
    , zipFileName
    , outFile
    , zipNum = 0
    , checkFinished = getCheckFinished(Object.keys(toZip).length, callback)

  for (var key in toZip) {
    if (name) {
      zipFileName = path.join(outPath,
                              path.basename(name) + strings.SEPARATOR_OUT_NAME +
                                zipNum + strings.EXTENSION_ZIP)
      ++zipNum
    } else {
      zipFileName = path.join(outPath, path.basename(key) + strings.EXTENSION_ZIP)
    }
    outFile = fs.createWriteStream(zipFileName)
    zip = archiver('zip')
    zip.on('error', this.emit.bind(this, 'error'))
    zip.on('finish', checkFinished)
    zip.pipe(outFile)
    if (toZip[key].isDir) {
      zip.directory(key, path.basename(key))
    } else {
      zip.append(fs.createReadStream(key), { name: path.basename(key) })
    }
    zip.finalize()
  }
}

function getCheckFinished(total, callback) {
  var numFinished = 0
  return function () {
    ++numFinished
    if (numFinished >= total) {
      callback()
    }
  }
}
