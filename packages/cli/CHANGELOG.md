# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.8.0 to ^2.8.1

## [2.9.0](https://github.com/usecannon/cannon/compare/v2.8.2...v2.9.0) (2023-10-25)


### Features

* Add fetch command and improve publish outputs ([#479](https://github.com/usecannon/cannon/issues/479)) ([286d44b](https://github.com/usecannon/cannon/commit/286d44b248efd5352cb68a54a25304a201264ddc))
* **cli:** add ability to trace transactions while in cannon run ([#507](https://github.com/usecannon/cannon/issues/507)) ([099a02e](https://github.com/usecannon/cannon/commit/099a02e81e18be3561716f69e5a4a522a57b3d42))


### Bug Fixes

* **builder:** handling of package url modification during copy ([#529](https://github.com/usecannon/cannon/issues/529)) ([7c5d585](https://github.com/usecannon/cannon/commit/7c5d5857770412d0f47b52ee4c8beace9504441d))
* **cli:** cannon executable ([#499](https://github.com/usecannon/cannon/issues/499)) ([9b7fa1f](https://github.com/usecannon/cannon/commit/9b7fa1f32ca99c9aebf3d6fc4e441c17c70fa1c7))
* **cli:** much faster startup ([#508](https://github.com/usecannon/cannon/issues/508)) ([5c199ee](https://github.com/usecannon/cannon/commit/5c199ee4a0977b63a69c12c000e78dc958ccde59))
* **cli:** proper error on providerurl chainid and chainid mismatch ([#509](https://github.com/usecannon/cannon/issues/509)) ([3f9d4ab](https://github.com/usecannon/cannon/commit/3f9d4ab71d9fb8758bf1bee256524feb8fef0fd5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.8.2 to ^2.9.0

## [2.8.2](https://github.com/usecannon/cannon/compare/v2.8.1...v2.8.2) (2023-10-09)


### Bug Fixes

* **cli:** fix bug on interact package ref cli input validation ([#488](https://github.com/usecannon/cannon/issues/488)) ([0db8961](https://github.com/usecannon/cannon/commit/0db8961c268a57833aa052182a3aea4b11cb6c4d))
* **cli:** foundry doesn't resolve evm version ([#480](https://github.com/usecannon/cannon/issues/480)) ([14e34d6](https://github.com/usecannon/cannon/commit/14e34d67009152e2d9cac07e46d2a6f7f1e4f97b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.8.1 to ^2.8.2

## [2.8.0](https://github.com/usecannon/cannon/compare/v2.7.1...v2.8.0) (2023-09-29)


### Features

* **cli:** Add support for preset package reference in CLI  ([#449](https://github.com/usecannon/cannon/issues/449)) ([ec19aff](https://github.com/usecannon/cannon/commit/ec19affe86e0fdc6623ae6fc5d5187118757d2f0))


### Bug Fixes

* **cli:** improve provider resolution outputs and remove sensitive information from debug logs ([#418](https://github.com/usecannon/cannon/issues/418)) ([545298f](https://github.com/usecannon/cannon/commit/545298fc3ca03d8e62a1da05200c191d3084d670))
* **cli:** prepend 0x to decode input tx data ([#483](https://github.com/usecannon/cannon/issues/483)) ([57ac4d1](https://github.com/usecannon/cannon/commit/57ac4d14d1505c46b30d348d4e7d0f6008939f74))
* enforce setting publishIpfsUrl for publish command ([#456](https://github.com/usecannon/cannon/issues/456)) ([bff21fb](https://github.com/usecannon/cannon/commit/bff21fb1b81aee605612d36ffb62f7d5e2b2f641))
* fix preset name in deploy local tag filename ([#472](https://github.com/usecannon/cannon/issues/472)) ([acf9d2d](https://github.com/usecannon/cannon/commit/acf9d2d29daf89fead861d7fca0ffbe42e0c6c74))
* package name validations ([#471](https://github.com/usecannon/cannon/issues/471)) ([e4aef62](https://github.com/usecannon/cannon/commit/e4aef62f98ca4364bfb8efc432222f6909c5d082))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.7.1 to ^2.8.0

## [2.7.1](https://github.com/usecannon/cannon/compare/v2.7.0...v2.7.1) (2023-09-17)


### Bug Fixes

* `cannon trace` bugs ([#463](https://github.com/usecannon/cannon/issues/463)) ([aaf5165](https://github.com/usecannon/cannon/commit/aaf516522773e13ca7e5828f5b03cc073bdd7093))
* 2.7 regressions ([#461](https://github.com/usecannon/cannon/issues/461)) ([b9ecbb7](https://github.com/usecannon/cannon/commit/b9ecbb7b2564345babd89c9230247970805b570f))
* misc debug mode fixes ([#424](https://github.com/usecannon/cannon/issues/424)) ([2f99df5](https://github.com/usecannon/cannon/commit/2f99df57d599653f86594ac889a0c30f8fb74c21))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.7.0 to ^2.7.1

## [2.7.0](https://github.com/usecannon/cannon/compare/v2.6.1...v2.7.0) (2023-09-16)


### Features

* **cli:** add `cannon trace` command ([#455](https://github.com/usecannon/cannon/issues/455)) ([177cdbf](https://github.com/usecannon/cannon/commit/177cdbf17e63115e92ffa11f176b93de4ab708ca))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.6.1 to ^2.7.0

## [2.6.1](https://github.com/usecannon/cannon/compare/v2.6.0...v2.6.1) (2023-09-13)


### Bug Fixes

* gitHeads references from lerna ([ae76eae](https://github.com/usecannon/cannon/commit/ae76eaeda3e83ab14a09198449d0e0f096ee7839))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.6.0 to ^2.6.1

## [2.6.0](https://github.com/usecannon/cannon/compare/v2.5.4...v2.6.0) (2023-09-11)


### Features

* **router:** fix plugin loading ([f199216](https://github.com/usecannon/cannon/commit/f1992163722f28eb35b44e73c931e417b3c4ec1a))


### Bug Fixes

* **cli:** add error on upgrade-from when package not found ([#407](https://github.com/usecannon/cannon/issues/407)) ([2630d2c](https://github.com/usecannon/cannon/commit/2630d2ce9db57379aa0a473bac2e736160e72ed7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.5.4 to ^2.6.0

## [2.5.4](https://github.com/usecannon/cannon/compare/v2.5.3...v2.5.4) (2023-08-30)


### Bug Fixes

* remove anvil from inspect command and add support for invoke target string ([#364](https://github.com/usecannon/cannon/issues/364)) ([1dcaffb](https://github.com/usecannon/cannon/commit/1dcaffbbefad4b03841843f8f0f07c7eaf9fe93b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @usecannon/builder bumped from ^2.5.3 to ^2.5.4
