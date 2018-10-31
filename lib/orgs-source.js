const axios = require('axios')
const eos = require('end-of-stream')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')

const kTimeout = 15000

class OrgsSource {
  constructor (tubes, opts) {
    this.tubes = tubes
    this.tmpFolder = opts.tmpFolder
    this.sourceRegistry = opts.sourceRegistry
    this.sourceToken = opts.sourceToken
    this.targetToken = opts.targetToken
    this.targetRegistry = opts.targetRegistry
    this.migrateFile = opts.migrateFile
  }
  async start () {
    try {
      const packages = fs.readFileSync(this.migrateFile, 'utf8').trim().split(/\r?\n/)
      for (let i = 0, pkg; (pkg = packages[i]) !== undefined; i++) {
        const json = await this.getJson(pkg, this.sourceRegistry, this.sourceToken)
        let targetJson = { time: {} }
        try {
          // if target token is provided, fetch the upstream document and skip
          // any duplicates.
          if (this.targetToken) {
            targetJson = await this.getJson(pkg, this.targetRegistry, this.targetToken)
          }
        } catch (err) {
          // probably just a 404.
        }
        await this.processJson(json, Object.keys(targetJson.time))
      }
    } catch (err) {
      console.warn(err.stack)
    }
  }
  async getJson (pkgName, registry, token) {
    const getOpts = {
      method: 'get',
      headers: {
        authorization: `bearer ${token}`
      },
      url: `${registry}/${pkgName.replace('/', '%2F')}`
    }

    return axios(getOpts)
      .then(function (response) {
        return response.data
      })
  }
  async processJson (json, publishedVersions) {
    const versions = Object.keys(json.versions)
    for (let i = 0, version; (version = json.versions[versions[i]]) !== undefined; i++) {
      if (publishedVersions.indexOf(version.version) !== -1) {
        console.info(`${version.name}@${version.version} already published`)
        continue
      }
      for (let j = 0; j < 5; j++) {
        if (version.dist && version.dist.tarball) {
          try {
            const tarball = version.dist.tarball
            const filename = await this.download(tarball)
            if (filename) await this.tubes.publish(filename)
          } catch (err) {
            console.warn(err.message)
            if (err.message.indexOf('code E403') === -1) continue
          }
        }
        break
      }
    }
  }
  async download (tarball) {
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
          const timer = setTimeout(() => {
            const err = Error(`timeout downloading ${tarball}`)
            err.code = 'ETIMEOUT'
            return reject(err)
          }, kTimeout)
          eos(stream, err => {
            clearTimeout(timer)
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
