const axios = require('axios')
const eos = require('end-of-stream')
const fs = require('fs')
const path = require('path')
const removeFile = require('./remove-file')
const transformTarball = require('./transform-tarball')
const uuid = require('uuid/v4')
const handleAxiosResponse = require('handle-axios-response')

const kTimeout = 15000

class OrgsSource {
  constructor (tubes, opts) {
    this.maxFetchAttempts = opts.maxFetchAttempts
    this.keepArtifacts = opts.keepArtifacts
    this.migrateFile = opts.migrateFile
    this.removePublishRegistry = opts.removePublishRegistry
    this.scopes = opts.scopes
    this.sourceRegistry = opts.sourceRegistry
    this.sourceToken = opts.sourceToken
    this.targetRegistry = opts.targetRegistry
    this.targetToken = opts.targetToken
    this.tmpFolder = opts.tmpFolder
    this.traceLog = opts.traceLog
    this.tubes = tubes

    console.info('scopes:', this.scopes)
  }

  async start () {
    try {
      const packages = fs.readFileSync(this.migrateFile, 'utf8').trim().split(/\r?\n/)
      for (let i = 0, pkg; (pkg = packages[i]) !== undefined; i++) {
        if (this.scopes) {
          const [, scope] = pkg.match(/^(@[^/]+)[/]/) || []
          if (!scope || !this.scopes.includes(scope)) {
            if (this.traceLog) {
              console.info(`Skipping package ${pkg} (not in the scopes list)`)
            }
            continue
          }
        }
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
      url: `${registry}/${pkgName.replace('/', '%2F')}`,
      validateStatus: () => true
    }

    return axios(getOpts)
      .then(handleAxiosResponse('Error fetching package JSON', { logError: this.traceLog }))
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
      for (let j = 0; j < this.maxFetchAttempts; j++) {
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
            if (err.message.indexOf('code E403') === -1) continue
          }
        }
        break
      }
    }
  }

  async download (tarball) {
    const filename = path.resolve(this.tmpFolder, `${uuid()}.tgz`)

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
      },
      validateStatus: () => true
    }

    return axios(downloadOpts)
      .then(handleAxiosResponse('Error downloading tarball', { logError: this.traceLog }))
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
