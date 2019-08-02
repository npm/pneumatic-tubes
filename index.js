#!/usr/bin/env node

const exec = require('child_process').exec
const mkdirp = require('mkdirp')
const opts = require('yargs')
  .command('couch-import', 'import from legacy changes feed', (yargs) => {
    yargs
      .option('source-couch-db', {
        describe: 'changes feed to migrate (should include sharedFetchSecret)',
        default: process.env.PNEUMATIC_TUBES_SOURCE_COUCHDB,
        required: true,
        alias: 'c'
      })
      .option('shared-fetch-secret', {
        describe: 'password for changes feed',
        default: process.env.PNEUMATIC_TUBES_SHARED_FETCH_SECRET,
        alias: 's'
      })
      .option('target-registry', {
        describe: 'registry to publish to (ensure you are logged in)',
        default: process.env.PNEUMATIC_TUBES_TARGET_REGISTRY,
        required: true,
        alias: 'R'
      })
      .option('last-sequence', {
        describe: 'changes feed sequence to start at',
        default: process.env.PNEUMATIC_TUBES_LAST_SEQUENCE ? Number(process.env.PNEUMATIC_TUBES_LAST_SEQUENCE) : 0,
        alias: 'seq'
      })
  })
  .command('orgs-import', 'import list of scoped packages from npm Orgs', (yargs) => {
    yargs
      .option('source-registry', {
        describe: 'npm registry to import from (ensure you are logged in)',
        default: 'https://registry.npmjs.org',
        required: true,
        alias: 'r'
      })
      .option('source-token', {
        describe: 'token for source registry (can be found in .npmrc after logging in)',
        required: true,
        alias: 't'
      })
      .option('migrate-file', {
        describe: 'a newline delimited list of packages to migrate',
        required: true,
        alias: 'm'
      })
      .option('target-registry', {
        describe: 'registry to publish to (ensure you are logged in)',
        default: process.env.PNEUMATIC_TUBES_TARGET_REGISTRY,
        required: true,
        alias: 'R'
      })
      .option('target-token', {
        describe: 'token for target registry (can be found in .npmrc after logging in)',
        required: false,
        alias: 'T'
      })
      .option('max-fetch-attempts', {
        type: 'number',
        desc: 'the maximum number of times to attempt fetching a tarball before moving on to the next version',
        default: 5,
        alias: 'f'
      })
  })
  .option('tmp-folder', {
    describe: 'temporary folder to stage packages in',
    default: '/tmp/tarballs',
    alias: 'tmp'
  })
  .option('remove-publish-registry', {
    type: 'boolean',
    desc: 'if .publishConfig.registry exists in package.json, remove it rather than replacing it with the target-registry',
    default: false,
    required: false,
    alias: 'rm'
  })
  .option('keep-artifacts', {
    type: 'boolean',
    desc: 'keep the artifacts (tarballs) around for debugging, rather than deleting post publish',
    default: false,
    required: false,
    alias: 'k'
  })
  .option('scopes', {
    type: 'array',
    describe: 'only publish packages from this scope (may supply multiple times)',
    coerce: scopes => {
      const verified = scopes
        .map(scope => (scope[0] === '@' ? '' : '@') + scope)
        .filter(scope => scope.length > 1)

      if (verified.length < scopes.length) {
        throw new Error('Invalid scope(s)')
      }

      return verified
    }
  })
  .option('trace-log', {
    type: 'boolean',
    desc: 'turn on extra detailed logging for tracking down issues with tarball transformations',
    alias: 'v'
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
