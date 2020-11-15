const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const du = require('du')
const binPacker = require('bin-packer')
const statOver = require('./util/stat-over')
const strings = require('./res/strings')

module.exports = function (options) {
  const zipBlocks = new ZipBlocks(options)
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
  if (options === null || typeof options !== 'object') {
    return
  }
  for (const key in options) {
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
  // allows name to pass through undefined - should be checked by each 'action'
  const that = this
  const inPath = args[0]
  let outPath = args[1]
  let name
  let callback

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
    if (!existsOut) {
      outPath = inPath
    }
    action.call(that, inPath, outPath, name, callback)
  })
}

function zipFilesInDir() {
  const that = this
  const files = []

  handleArgs.call(this, arguments, function (inPath, outPath, name, callback) {
    name = name || inPath
    if (this._exact) {
      discoverZip.call(this, inPath, outPath, name, callback)
    } else {
      listAndZip.call(this, inPath, outPath, name, callback)
    }
  })

  function listAndZip(inPath, outPath, name, callback) {
    statOver(inPath, onFile, onDir, elseErr.bind(that), blockAndZip)

    function onFile(filePath, stats, statOverCB) {
      files.push({ path: filePath, isDir: false , size: stats.size, })
      statOverCB()
    }

    function onDir(filePath, stat, statOverCB) {
      if (!that._filesOnly) {
        const dir = { path: filePath, isDir: true, }
        files.push(dir)
        du(filePath, function (err, size) {
          if (err) {
            that.emit('error', err)
          } else {
            dir.size = size
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
  const that = this

  handleArgs.call(this, arguments, listAndZip)

  function listAndZip(inPath, outPath, name, callback) {
    const files = {}
    statOver(inPath, onFile, onDir, elseErr.bind(that), blockAndZip)

    function onFile(filePath, stats, statOverCB) {
      files[filePath] = { isDir: false, }
      statOverCB()
    }

    function onDir(filePath, stat, statOverCB) {
      if (!that._filesOnly) {
        files[filePath] = { isDir: true, }
      }
      statOverCB()
    }

    function blockAndZip() {
      doZipKeys.call(that, files, outPath, name, callback)
    }
  }
}

function discoverZip(inPath, outPath, name, callback) {
  const that = this
  const tempDirPath = path.join(outPath,
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
    const files = []
    const extLength = that._ext.length

    statOver(tempDirPath, onFile, onDir, elseErr.bind(that), rmTempAndZip)

    function onFile(filePath, stats, statOverCB) {
      const baseName = path.basename(filePath)
      const originalPath = path.join(inPath,
                                     baseName.substring(0, baseName.length - extLength))
      files.push({ path: originalPath, size: stats.size, isDir: false, })
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
        if (err) {
          that.emit('error', err)
        }
      })
    } catch (err) {
      that.emit('error', err)
    }
    callback()
  }
}

function elseErr(err, statOverCB) {
  this.emit('error', err)
  statOverCB()
}

function getBlocks(files) {
  const max = this._blockSize * this._BLOCK_SIZE_UNIT / this._compressionRatio
  
  if (this._addOversize) {
    const {'bins': bins, 'oversized': oversized,} = binPacker.bestFitDecreasing(files, file => file.size, max, true)
    for (const oversize of oversized) {
      bins.push([oversize,])
    }
    return bins
  } else {
    const {'bins': bins, 'oversized': oversized,} = binPacker.bestFitDecreasing(files, file => file.size, max)
    if (Object.keys(oversized).length !== 0) {
      this.emit('error', new Error(strings.ERROR_OVERSIZED + JSON.stringify(oversized)))
    }
    return bins
  }
}

function doZip(blocks, outPath, name, callback) {
  const checkFinished = getCheckFinished(blocks.length, callback)

  for (const [zipNum, thisBlock] of blocks.entries()) {
    const zipFileName = path.join(
        outPath,
        path.basename(name) + strings.SEPARATOR_OUT_NAME + zipNum + strings.EXTENSION_ZIP)
    
    const zip = getArchiverTo.call(this, fs.createWriteStream(zipFileName), checkFinished)

    for (const file of thisBlock) {
      if (file.isDir) {
        zip.directory(file.path, path.basename(file.path))
      } else {
        zip.append(fs.createReadStream(file.path), { name: path.basename(file.path), })
      }
    }
    zip.finalize()
  }
}

function doZipKeys(toZip, outPath, name, callback) {
  const checkFinished = getCheckFinished(Object.keys(toZip).length, callback)
  let zipNum = 0

  for (const key in toZip) {
    let zipFileName
    if (name) {
      zipFileName = path.join(
          outPath,
          path.basename(name) + strings.SEPARATOR_OUT_NAME + zipNum + strings.EXTENSION_ZIP)
      ++zipNum
    } else {
      zipFileName = path.join(outPath, path.basename(key) + strings.EXTENSION_ZIP)
    }

    const zip = getArchiverTo.call(this, fs.createWriteStream(zipFileName), checkFinished)
    if (toZip[key].isDir) {
      zip.directory(key, path.basename(key))
    } else {
      zip.append(fs.createReadStream(key), { name: path.basename(key), })
    }
    zip.finalize()
  }
}

function getArchiverTo(outFile, onFinish) {
  const zip = archiver('zip')
  zip.on('error', this.emit.bind(this, 'error'))
  zip.on('finish', onFinish)
  zip.pipe(outFile)
  return zip
}

function getCheckFinished(total, callback) {
  let numFinished = 0
  return function () {
    ++numFinished
    if (numFinished >= total) {
      callback()
    }
  }
}
