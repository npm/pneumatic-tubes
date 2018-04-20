const axios = require('axios')
const ChangesStream = require('changes-stream');
const eos = require('end-of-stream')
const exec = require('child_process').exec
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const uuid = require('uuid')

const sourceRegistry = process.env.PNEUMATIC_TUBES_SOURCE_REGISTRY
const targetRegistry = process.env.PNEUMATIC_TUBES_TARGET_REGISTRY
const lastSequence = process.env.PNEUMATIC_TUBES_LAST_SEQUENCE

class Tubes {
  constructor (opts) {
    this.tmpFolder = '/tmp/tarballs'
    mkdirp.sync('/tmp/tarballs')
  }
  series () {
    const changes = new ChangesStream({
      db: sourceRegistry, // full database URL
      include_docs: true, // whether or not we want to return the full document as a property,
      since: lastSequence
    })
    changes.on('readable', async () => {
      const change = changes.read()
      console.info(`processing sequence ${change.seq}`)
      if (change.doc && change.doc.versions) {
        changes.pause()
        try {
          await this.processChange(change)
        } catch (err) {
          console.warn(err)
        }
        changes.resume()
      }
    })
  }
  async processChange (change) {
    const versions = Object.keys(change.doc.versions)
    for (var i = 0, version; (version = change.doc.versions[versions[i]]) !== undefined; i++) {
      if (version.dist && version.dist.tarball) {
        try {
          const tarball = version.dist.tarball
          const filename = await this.download(tarball)
          await this.publish(filename)
        } catch (err) {
          console.warn(err.message)
        }
      }
    }
  }
  download (tarball) {
    const filename = path.resolve(this.tmpFolder, `${uuid.v4()}.tgz`)
    return axios({
      method: 'get',
      url: tarball,
      responseType: 'stream'
    })
    .then(function(response) {
      return new Promise((resolve, reject) => {
        const stream = response.data.pipe(fs.createWriteStream(filename))
        eos(stream, err => {
          if (err) return reject(err)
          else return resolve()
        })
      })
    })
    .then(() => {
      console.info(`finished writing ${filename}`)
      return filename
    })
  }
  publish (filename) {
    return new Promise((resolve, reject) => {
      exec(`npm --registry=${targetRegistry} publish ${filename}`, {
        cwd: this.tmpFolder,
        env: process.env
      }, (err, stdout, stderr) => {
        if (err) return reject(err)
        else {
          console.info(`published ${stdout.trim()}`)
          return resolve()
        }
      })
    })
  }
}

module.exports = function (opts) {
  return new Tubes(opts)
}

const tubes = module.exports()
tubes.series()
