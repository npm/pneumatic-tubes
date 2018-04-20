# pneumatic-tubes

Transfer kappa registry mirror contents to an npmE appliance.

## Preparation

- Node.js 8+
- npm 5 - 5.6 (5.7+ are incompatible with npmE)
- run `npm install`
- login to your _target_ registry if needed: `npm --registry=<target-registry-url> login`
- setup environment variables for these registries
  - `PNEUMATIC_TUBES_SOURCE_COUCHDB = <source-couchdb-url>`
  - `PNEUMATIC_TUBES_TARGET_REGISTRY = <target-registry-url>`
  - _[optional]_ `PNEUMATIC_TUBES_LAST_SEQUENCE = <sequence-number>` defaults to `0` (zero)

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

