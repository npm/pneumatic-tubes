const axios = require('axios')
const eos = require('end-of-stream')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

const ChangesStream = require('changes-stream')

class ChangesStreamSource {
  constructor (tubes, opts) {
    this.tubes = tubes
    this.sourceCouchDb = opts.sourceCouchDb
    this.lastSequence = opts.lastSequence
    this.tmpFolder = opts.tmpFolder
    this.sharedFetchSecret = opts.sharedFetchSecret
  }
  async start () {
    const streamOpts = {
      db: this.sourceCouchDb, // full database URL
      include_docs: true, // whether or not we want to return the full document as a property,
      since: this.lastSequence
    }

    // upstream CouchDB feed might be password protected.
    if (this.sharedFetchSecret) {
      streamOpts.query_params = {
        sharedFetchSecret: this.sharedFetchSecret
      }
    }

    try {
      const maxSequence = await this._getMaximumSequence()
      const changes = new ChangesStream(streamOpts)
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
        // we've finished migrating all packages.
        if (change.seq >= maxSequence) {
          console.info('finished migratinng packages \\o/')
          process.exit(0)
        }
      })
    } catch (err) {
      console.error(err.stack)
    }
  }
  async processChange (change) {
    const versions = Object.keys(change.doc.versions)
    for (var i = 0, version; (version = change.doc.versions[versions[i]]) !== undefined; i++) {
      if (version.dist && version.dist.tarball) {
        try {
          const tarball = version.dist.tarball
          const filename = await this.download(tarball)
          if (filename) await this.tubes.publish(filename)
        } catch (err) {
          console.warn(err.message)
        }
      }
    }
  }
  download (tarball) {
    const filename = path.resolve(this.tmpFolder, `${uuid.v4()}.tgz`)

    if (tarball.indexOf('@') === -1) {
      console.warn(`${tarball} was not a scoped package`)
      return false
    }

    console.info('downloading ', tarball)

    const downloadOpts = {
      method: 'get',
      url: this.sharedFetchSecret ? `${tarball}?sharedFetchSecret=${this.sharedFetchSecret}` : tarball,
      responseType: 'stream'
    }

    return axios(downloadOpts)
      .then(function (response) {
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
  async _getMaximumSequence () {
    const registryUrl = this.sourceCouchDb.replace('/_changes', '')

    const downloadOpts = {
      method: 'get',
      url: this.sharedFetchSecret ? `${registryUrl}?sharedFetchSecret=${this.sharedFetchSecret}` : registryUrl,
      responseType: 'json'
    }

    return axios(downloadOpts)
      .then(response => {
        return response.data.update_seq
      })
  }
}

module.exports = ChangesStreamSource
