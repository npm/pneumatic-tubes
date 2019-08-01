const axios = require('axios')
const eos = require('end-of-stream')
const fs = require('fs')
const path = require('path')
const removeFile = require('./remove-file')
const transformTarball = require('./transform-tarball')
const uuid = require('uuid/v4')

const ChangesStream = require('@npmcorp/changes-stream')

class ChangesStreamSource {
  constructor (tubes, opts) {
    this.keepArtifacts = opts.keepArtifacts
    this.lastSequence = opts.lastSequence
    this.removePublishRegistry = opts.removePublishRegistry
    this.sharedFetchSecret = opts.sharedFetchSecret
    this.sourceCouchDb = opts.sourceCouchDb
    this.targetRegistry = opts.targetRegistry
    this.tmpFolder = opts.tmpFolder
    this.tubes = tubes
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
        console.info(`processing sequence ${change.seq}/${maxSequence}`)
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
          console.info('finished migrating packages \\o/')
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
          const oldArtifact = await this.download(tarball)
          const newArtifact = await transformTarball(oldArtifact, this)
          if (newArtifact) {
            await this.tubes.publish(newArtifact)
            if (!this.keepArtifacts) {
              await removeFile(newArtifact)
            }
          }
        } catch (err) {
          console.warn(err.message)
        }
      }
    }
  }

  download (tarball) {
    const filename = path.resolve(this.tmpFolder, `${uuid()}.tgz`)

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
