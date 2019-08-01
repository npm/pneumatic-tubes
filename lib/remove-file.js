const fs = require('fs')

module.exports = removeFile

async function removeFile (filename) {
  return new Promise((resolve, reject) => {
    fs.unlink(filename, error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}
