# pneumatic-tubes

Migrate from kappa, npm Enterprise Legacy, and npm Orgs, to npm Enterprise SaaS.

## Preparation

- Node.js 8+
- npm 5 - 5.6 (5.7+ are incompatible with npmE)
- run `npm install`
- login to your _target_ registry if needed: `npm --registry=<target-registry-url> login`

## Importing From Kappa

You need to point the import script at the CouchDB instance associated with your kappa proxy. The kappa proxy itself doesn't foward the `_changes` feed, so direct couch access is necessary.

Run:

```bash
./index.js couch-import --source-couch-db=[couch-db-url]/_changes --target-registry=[target-registry-url]
```

## Importing From Legacy npm Enterprise

Fetch `Secret used between services` from your npm Enterprise console.

Run:

```bash
./index.js couch-import --source-couch-db=[couch-db-url]/_changes --target-registry=[target-registry-url] --shared-fetch-secret=[password-from-console]
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
