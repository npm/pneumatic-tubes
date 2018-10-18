#!/usr/bin/env node

const exec = require('child_process').exec
const mkdirp = require('mkdirp')
const opts = require('yargs')
  .command('couch-import', 'import from legacy changes feed', (yargs) => {
    yargs
      .option('source-couch-db', {
        describe: 'changes feed to migrate (should include sharedFetchSecret)',
        default: process.env.PNEUMATIC_TUBES_SOURCE_COUCHDB,
        required: true
      })
      .option('shared-fetch-secret', {
        describe: 'password for changes feed',
        default: process.env.PNEUMATIC_TUBES_SHARED_FETCH_SECRET
      })
      .option('target-registry', {
        describe: 'registry to publish to (ensure you are logged in)',
        default: process.env.PNEUMATIC_TUBES_TARGET_REGISTRY,
        required: true
      })
      .option('last-sequence', {
        describe: 'changes feed sequence to start at',
        default: process.env.PNEUMATIC_TUBES_LAST_SEQUENCE ? Number(process.env.PNEUMATIC_TUBES_LAST_SEQUENCE) : 0
      })
  })
  .option('tmp-folder', {
    describe: 'temporary folder to stage packages in',
    default: '/tmp/tarballs'
  })
  .demandCommand(1)
  .argv

const ChangesStreamSource = require('./lib/changes-stream-source')

class Tubes {
  constructor (opts) {
    this.opts = opts
    this.tmpFolder = opts.tmpFolder
    this.targetRegistry = opts.targetRegistry
    mkdirp.sync(this.tmpFolder)
  }
  start () {
    let source = null
    source = new ChangesStreamSource(this, this.opts)
    source.start()
  }
  publish (filename) {
    return new Promise((resolve, reject) => {
      exec(`npm --registry=${this.targetRegistry} publish ${filename}`, {
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

const tubes = new Tubes(opts)
tubes.start()
