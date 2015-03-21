module.exports = statOver

function statOver(dir, onFile, onDir, elseErr, callback) {
  // onFile, onDir take three args: filePath, stats, cb
  // elseErr takes two args: err, cb
  // They must all call cb!
  var fs = require('fs')
    , path = require('path')
    , numReady = 0
    , total

  fs.readdir(dir, function (err, listing) {
    if (err) {
      elseErr()
      callback()
      return
    }
    total = listing.length
    for (var item in listing) {
      runStat(path.join(dir, listing[item]))
    }    
  })
  
  function runStat(filePath) {
    fs.stat(filePath, function (err, stats) {
      if (err) {
        elseErr(err, checkDone)
      } else if (stats.isFile()) {
        onFile(filePath, stats, checkDone)
      } else if (stats.isDirectory()) {
        onDir(filePath, stats, checkDone)
      }
    })
  }

  function checkDone(err) {
    if (err) {
      callback(err)
      callback = function () {}
    } else {
      ++numReady
      if (numReady === total) {
        callback()
      }
    }
  }
}
