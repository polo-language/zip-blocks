var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , path = require('path')
  , archiver = require('archiver')
  , du = require('du')
  , binPacker = require('bin-packer')
  , statOver = require('./util/stat-over')


module.exports = function () {
  var zipBlocks = new ZipBlocks()
  zipBlocks.on('error', zipBlocks._onError)
  zipBlocks.on('newListener', syncErrorListener.bind(zipBlocks))
  return zipBlocks
}

function ZipBlocks() {
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
ZipBlocks.prototype.discoverZip = discoverZip

function syncErrorListener(event, listener) {
  if (event === 'error') {
    this.removeListener('error', this._onError)
    this._onError = listener
  }
}

function setCompressionRatio(ratio) {
  var RATIO_ERROR_STRING = 'Compression ratio must be between 0.01 and 1, inclusive. Using 1.'
  if (ratio < 0.01 || 1 < ratio) {
    this.emit('error', new Error(RATIO_ERROR_STRING))
    return
  }
  this._compressionRatio = ratio
}

function setOptions(options) {
  parseOptions.call(this, options)
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

  handleArgs.call(this, arguments, listAndZip)

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
    , files = {}

  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath, name, callback) {
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
                              '_' + Date.now())
    , files = {}
    , ext = '.zip'  // set in cstor when other compression methods implemented
    , extLength = ext.length

  fs.mkdir(tempDirPath, function (err) {
    if (err) {
      that.emit('error', err)
      return
    }
    // TODO: pass settings in here
    that.zipIndividually(inPath, tempDirPath, statTemps)
  })

  function statTemps() {
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
    this.emit('error', new Error('Oversized: ' + JSON.stringify(oversized)))
    return blocks
  }
}

function doZip(blocks, outPath, name, callback) {
  var zip
    , zipFileName
    , outFile
    , thisBlock
    , numKeys = blocks.length
    , numFinished = 0

  for (var zipNum in blocks) {
    zipFileName = path.join(outPath,
                            path.basename(name) + '_' + zipNum + '.zip')
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

  function checkFinished() {
    ++numFinished
    if (numFinished >= numKeys) {
      callback()
    }
  }
}

function doZipKeys(toZip, outPath, name, callback) {
  var zip
    , zipFileName
    , outFile
    , zipNum = 0
    , numKeys = Object.keys(toZip).length
    , numFinished = 0

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
    zip.on('finish', checkFinished)
    zip.pipe(outFile)
    if (toZip[key].isDir) {
      zip.directory(key, path.basename(key))
    } else {
      zip.append(fs.createReadStream(key), { name: path.basename(key) })
    }
    zip.finalize()
  }

  function checkFinished() {
    ++numFinished
    if (numFinished >= numKeys) {
      callback()
    }
  }
}


