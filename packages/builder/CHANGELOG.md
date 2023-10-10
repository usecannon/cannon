# Changelog

## [2.8.2](https://github.com/usecannon/cannon/compare/v2.8.1...v2.8.2) (2023-10-09)


### Bug Fixes

* add builder/src/ folder to package build ([#491](https://github.com/usecannon/cannon/issues/491)) ([8b3c084](https://github.com/usecannon/cannon/commit/8b3c084ef42c714a9a83cfd6f1b9d0c837b905c3))

## [2.8.1](https://github.com/usecannon/cannon/compare/v2.8.0...v2.8.1) (2023-09-29)


### Bug Fixes

* **builder:** fix zod package regex for validation ([#485](https://github.com/usecannon/cannon/issues/485)) ([e4fdda7](https://github.com/usecannon/cannon/commit/e4fdda7e5283df75a0b658a9eb1e0f0d7935132f))

## [2.8.0](https://github.com/usecannon/cannon/compare/v2.7.1...v2.8.0) (2023-09-29)


### Features

* **builder:** add highlight boolean to contract cannonfile spec ([#470](https://github.com/usecannon/cannon/issues/470)) ([06629e2](https://github.com/usecannon/cannon/commit/06629e23aca1bacf266a68072325332c9ec77f75))
* **cli:** Add support for preset package reference in CLI  ([#449](https://github.com/usecannon/cannon/issues/449)) ([ec19aff](https://github.com/usecannon/cannon/commit/ec19affe86e0fdc6623ae6fc5d5187118757d2f0))


### Bug Fixes

* **builder:** lock ethers version in builder package below 6.0.0 ([#484](https://github.com/usecannon/cannon/issues/484)) ([844c39e](https://github.com/usecannon/cannon/commit/844c39e3a486be2aa2602c5ff8c8bf9babb09c60))
* fix preset name in deploy local tag filename ([#472](https://github.com/usecannon/cannon/issues/472)) ([acf9d2d](https://github.com/usecannon/cannon/commit/acf9d2d29daf89fead861d7fca0ffbe42e0c6c74))
* package name validations ([#471](https://github.com/usecannon/cannon/issues/471)) ([e4aef62](https://github.com/usecannon/cannon/commit/e4aef62f98ca4364bfb8efc432222f6909c5d082))
* set default evmVersion to paris on Router's in not mainnet networks ([#466](https://github.com/usecannon/cannon/issues/466)) ([a24da85](https://github.com/usecannon/cannon/commit/a24da857b048d6c70c5f756535a518ec55d679ae))

## [2.7.1](https://github.com/usecannon/cannon/compare/v2.7.0...v2.7.1) (2023-09-17)


### Bug Fixes

* 2.7 regressions ([#461](https://github.com/usecannon/cannon/issues/461)) ([b9ecbb7](https://github.com/usecannon/cannon/commit/b9ecbb7b2564345babd89c9230247970805b570f))
* misc debug mode fixes ([#424](https://github.com/usecannon/cannon/issues/424)) ([2f99df5](https://github.com/usecannon/cannon/commit/2f99df57d599653f86594ac889a0c30f8fb74c21))

## [2.7.0](https://github.com/usecannon/cannon/compare/v2.6.1...v2.7.0) (2023-09-16)


### Features

* **cli:** add `cannon trace` command ([#455](https://github.com/usecannon/cannon/issues/455)) ([177cdbf](https://github.com/usecannon/cannon/commit/177cdbf17e63115e92ffa11f176b93de4ab708ca))
* **cli:** add anvil custom options to run and build commands ([#445](https://github.com/usecannon/cannon/issues/369)) [e9cf80b](https://github.com/usecannon/cannon/commit/e9cf80b385f9cd6fa7d6461d201d200d4090aea9)
* **cli:** Add ability to pass params through anvil ([#369](https://github.com/usecannon/cannon/issues/369)) [e9cf80b](https://github.com/usecannon/cannon/commit/e9cf80b385f9cd6fa7d6461d201d200d4090aea9)

* **registry**:  add package publication fee of 1 wei ([#387](https://github.com/usecannon/cannon/issues/387) [26027a0](https://github.com/usecannon/cannon/commit/26027a0333638478adea50228346b93ea1089aa3)


## [2.6.1](https://github.com/usecannon/cannon/compare/v2.6.0...v2.6.1) (2023-09-13)


### Bug Fixes

* gitHeads references from lerna ([ae76eae](https://github.com/usecannon/cannon/commit/ae76eaeda3e83ab14a09198449d0e0f096ee7839))
* update @synthetixio/router to 3.3.0 ([7110c21](https://github.com/usecannon/cannon/commit/7110c2110b87dbe1a63aece54ec2ed7aab9d0fc5))
* update @synthetixio/router to 3.3.0 ([4ecd62d](https://github.com/usecannon/cannon/commit/4ecd62d7565edf7aff92e7c07cb3e5a27d08f617))

## [2.6.0](https://github.com/usecannon/cannon/compare/v2.5.4...v2.6.0) (2023-09-11)


### Features

* **abi:** add the option to use a literal abi string ([#423](https://github.com/usecannon/cannon/issues/423)) ([3287cd1](https://github.com/usecannon/cannon/commit/3287cd1461eb357476a55c3f6358f5eeceab8498))
* **router:** add @synthetixio/router dependency ([9b0de26](https://github.com/usecannon/cannon/commit/9b0de26c395b856974a932d8dee5724998e05efb))
* **router:** add example ([6e5f177](https://github.com/usecannon/cannon/commit/6e5f177b53b8ca57939f6385bc84092d0cb0f9ac))
* **router:** add router action step ([56cab91](https://github.com/usecannon/cannon/commit/56cab91720b1bd35c945ad3757fa077268803609))
* **router:** add router step tests ([aa1e7ae](https://github.com/usecannon/cannon/commit/aa1e7ae1290650111443c867552f311c1291701b))
* **router:** add test fixtures ([ce7f2d3](https://github.com/usecannon/cannon/commit/ce7f2d3bae72cdd57b53e8544a6fffacfc1439e6))
* **router:** add usage of transparent-upgradable-proxy:4.9.3 ([0038f5f](https://github.com/usecannon/cannon/commit/0038f5f902eed9931e6abcd3bc7ea9ac2a59a425))
* **router:** fix plugin loading ([f199216](https://github.com/usecannon/cannon/commit/f1992163722f28eb35b44e73c931e417b3c4ec1a))
* **website:** Explorer UI ([09988e2](https://github.com/usecannon/cannon/commit/09988e28a85373d375a81a38affa06e1b83b5bde))
* **website:** Explorer UI ([09988e2](https://github.com/usecannon/cannon/commit/09988e28a85373d375a81a38affa06e1b83b5bde))


### Bug Fixes

* **builder:** Add preset reference in source/package name ([#415](https://github.com/usecannon/cannon/issues/415)) ([32c7745](https://github.com/usecannon/cannon/commit/32c77453464dc3c8be25df2c630d6ec026335781))
* tsconfig ([56e7943](https://github.com/usecannon/cannon/commit/56e79439cbda49fd0b49a56738b0c8b7041b5b93))

## [2.5.4](https://github.com/usecannon/cannon/compare/v2.5.3...v2.5.4) (2023-08-30)


### Bug Fixes

* remove anvil from inspect command and add support for invoke target string ([#364](https://github.com/usecannon/cannon/issues/364)) ([1dcaffb](https://github.com/usecannon/cannon/commit/1dcaffbbefad4b03841843f8f0f07c7eaf9fe93b))
