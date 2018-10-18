const axios = require('axios')
const eos = require('end-of-stream')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

class OrgsSource {
  constructor (tubes, opts) {
    this.tubes = tubes
    this.tmpFolder = opts.tmpFolder
    this.sourceRegistry = opts.sourceRegistry
    this.sourceToken = opts.sourceToken
    this.migrateFile = opts.migrateFile
  }
  async start () {
    try {
      const packages = fs.readFileSync(this.migrateFile, 'utf8').trim().split(/\r?\n/)
      for (let i = 0, pkg; (pkg = packages[i]) !== undefined; i++) {
        const json = await this.getJson(pkg)
        await this.processJson(json)
      }
    } catch (err) {
      console.warn(err.stack)
    }
  }
  async getJson (pkgName) {
    const getOpts = {
      method: 'get',
      headers: {
        authorization: `bearer ${this.sourceToken}`
      },
      url: `${this.sourceRegistry}/${pkgName.replace('/', '%2F')}`
    }

    return axios(getOpts)
      .then(function (response) {
        return response.data
      })
  }
  async processJson (json) {
    const versions = Object.keys(json.versions)
    for (var i = 0, version; (version = json.versions[versions[i]]) !== undefined; i++) {
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
      url: tarball,
      responseType: 'stream',
      headers: {
        authorization: `bearer ${this.sourceToken}`
      }
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
}

module.exports = OrgsSource
