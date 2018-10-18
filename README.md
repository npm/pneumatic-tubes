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

## Importing From npm Orgs

### Prerequisites

You must purchase and configure an [npm Enterprise](https://www.npm-enterprise.com/) instance before you can migrate from npm Orgs to npm Enterprise.

### 1. Create a matching organization in npm Enterprise

You should create an organization in npm Enterprise that matches the name of
the organization that you wish to migrate from in the public registry.

As an example, if you want to migrate from your organization `@babel` on the
public registry, create an organization named `babel` in npm Enterprise.

### 2. Create an authorization token

To migrate from npm Orgs, you need an authorization token from the public
registry.

1. Visit https://www.npmjs.com.
2. In the account drop down in the upper right corner of the page, click "Tokens".
3. Click "Create New Token", then copy the generated token to a local text file.

### 3. Login to your npm Enterprise instance
As an npm Enterprise administrator, log in to your instance:
```
npm config set registry https://registry.my-instance.npme.io
npm login
```

### 4. Create a text file containing the packages you wish to migrate

_Note: you can only publish scoped packages to your private registry._

The text file should look something like this:

```
@babel/runtime
@babel/core
@babel/template
```

### 5. Run the migration tool

It's now time to run the migration tool, using the token and text file that
you generated.

_Note: this will migrate all versions of each package listed in the text file._

```
./index.js orgs-import --source-token=[redacted] --target-registry=https://registry.my-instance.npme.io --migrate-file=migrate-file.txt
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
