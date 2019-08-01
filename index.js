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
  .command('orgs-import', 'import list of scoped packages from npm Orgs', (yargs) => {
    yargs
      .option('source-registry', {
        describe: 'npm registry to import from (ensure you are logged in)',
        default: 'https://registry.npmjs.org',
        required: true
      })
      .option('source-token', {
        describe: 'token for source registry (can be found in .npmrc after logging in)',
        required: true
      })
      .option('migrate-file', {
        describe: 'a newline delimited list of packages to migrate',
        required: true
      })
      .option('target-registry', {
        describe: 'registry to publish to (ensure you are logged in)',
        default: process.env.PNEUMATIC_TUBES_TARGET_REGISTRY,
        required: true
      })
      .option('target-token', {
        describe: 'token for target registry (can be found in .npmrc after logging in)',
        required: false
      })
      .option('max-fetch-attempts', {
        type: 'number',
        desc: 'the maximum number of times to attempt fetching a tarball before moving on to the next version',
        default: 5
      })
  })
  .option('tmp-folder', {
    describe: 'temporary folder to stage packages in',
    default: '/tmp/tarballs'
  })
  .option('remove-publish-registry', {
    type: 'boolean',
    desc: 'if .publishConfig.registry exists in package.json, remove it rather than replacing it with the target-registry',
    default: false,
    required: false
  })
  .option('keep-artifacts', {
    type: 'boolean',
    desc: 'keep the artifacts (tarballs) around for debugging, rather than deleting post publish',
    default: false,
    required: false
  })
  .option('trace-log', {
    type: 'boolean',
    desc: 'turn on extra detailed logging for tracking down issues with tarball transformations'
  })
  .demandCommand(1)
  .argv

const ChangesStreamSource = require('./lib/changes-stream-source')
const OrgsSource = require('./lib/orgs-source')

class Tubes {
  constructor (opts) {
    this.opts = opts
    this.tmpFolder = opts.tmpFolder
    this.targetRegistry = opts.targetRegistry
    mkdirp.sync(this.tmpFolder)
  }

  start () {
    let source = null
    if (this.opts._.indexOf('couch-import') !== -1) {
      source = new ChangesStreamSource(this, this.opts)
    } else {
      source = new OrgsSource(this, this.opts)
    }
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
