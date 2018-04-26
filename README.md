# pneumatic-tubes

Transfer kappa registry mirror contents to an npmE appliance.

## Preparation

- Node.js 8+
- npm 5 - 5.6 (5.7+ are incompatible with npmE)
- run `npm install`
- login to your _target_ registry if needed: `npm --registry=<target-registry-url> login`
- options are now exposed as both options and environment variables

## Usage

```
$ node index.js --help
Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --source-couchdb   the CouchDB from which to stream changes
                           [string] [default: "http://localhost:15984/registry"]
  --target-registry  the registry to populate
                                    [string] [default: "http://localhost:18080"]
  --last-sequence    the source sequence                   [number] [default: 0]
  --halt-on-error    halt when an error occurs        [boolean] [default: false]
  --tmp-folder       scratch directory for package tarballs
                                             [string] [default: "/tmp/tarballs"]
```

# IMPORTANT: You need to point the import script at the CouchDB instance associated with your kappa proxy. The kappa proxy itself doesn't foward the `_changes` feed, so direct couch access is necessary.

## Run the Script

With all of the above setup steps complete, you shoud be ready to run the import:

```shell
npm run import
```

## Development

If you are making changes to `pneumatic-tubes`, you can test using a local kappa.

Run kappa in the foreground:
```shell
docker-compose up
```

OR

Run kappa in the background:
```shell
docker-compose up -d
```

When backgrounded, you can tail its logs thus (includes 20 lines of context):
```shell
docker logs --follow --tail 20 pneumatictubes_kappa_1
```

