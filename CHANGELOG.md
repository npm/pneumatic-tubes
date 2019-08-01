# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.3.1](https://github.com/bcoe/pneumatic-tubes/compare/v2.3.0...v2.3.1) (2019-08-01)


### Bug Fixes

* forward target-registry from changes-stream-source to transform-tarball ([f4990a0](https://github.com/bcoe/pneumatic-tubes/commit/f4990a0))

## [2.3.0](https://github.com/bcoe/pneumatic-tubes/compare/v2.2.0...v2.3.0) (2019-08-01)


### Features

* handle .publishConfig.registry setting from package.json if present ([baf69ca](https://github.com/bcoe/pneumatic-tubes/commit/baf69ca))

<a name="2.2.0"></a>
# [2.2.0](https://github.com/bcoe/pneumatic-tubes/compare/v2.1.1...v2.2.0) (2018-10-31)


### Features

* now optionally skips publishing duplicate package versions ([#5](https://github.com/bcoe/pneumatic-tubes/issues/5)) ([f831a83](https://github.com/bcoe/pneumatic-tubes/commit/f831a83))



<a name="2.1.1"></a>
## [2.1.1](https://github.com/bcoe/pneumatic-tubes/compare/v2.1.0...v2.1.1) (2018-10-29)


### Bug Fixes

* address performance issues consuming from registry ([#4](https://github.com/bcoe/pneumatic-tubes/issues/4)) ([b4b7d12](https://github.com/bcoe/pneumatic-tubes/commit/b4b7d12))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/bcoe/pneumatic-tubes/compare/v2.0.0...v2.1.0) (2018-10-18)


### Features

* add ability to migrate orgs ([#3](https://github.com/bcoe/pneumatic-tubes/issues/3)) ([645ce30](https://github.com/bcoe/pneumatic-tubes/commit/645ce30))



<a name="2.0.0"></a>
# 2.0.0 (2018-10-18)


### Features

* add support for migrating from npm Enterprise legacy ([#2](https://github.com/bcoe/pneumatic-tubes/issues/2)) ([e5b3633](https://github.com/bcoe/pneumatic-tubes/commit/e5b3633))
* README, config, and dev ([#1](https://github.com/bcoe/pneumatic-tubes/issues/1)) ([1bfa79f](https://github.com/bcoe/pneumatic-tubes/commit/1bfa79f))


### BREAKING CHANGES

* switched to using yargs and bin for kicking off tool
