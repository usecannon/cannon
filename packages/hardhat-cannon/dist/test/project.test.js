"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line no-implicit-dependencies
const chai_1 = require("chai");
const path_1 = __importDefault(require("path"));
const ExampleHardhatRuntimeEnvironmentField_1 = require("../src/ExampleHardhatRuntimeEnvironmentField");
const helpers_1 = require("./helpers");
describe('Integration tests examples', function () {
    describe('Hardhat Runtime Environment extension', function () {
        (0, helpers_1.useEnvironment)('hardhat-project');
        it('Should add the example field', function () {
            chai_1.assert.instanceOf(this.hre.example, ExampleHardhatRuntimeEnvironmentField_1.ExampleHardhatRuntimeEnvironmentField);
        });
        it('The example filed should say hello', function () {
            chai_1.assert.equal(this.hre.example.sayHello(), 'hello');
        });
    });
    describe('HardhatConfig extension', function () {
        (0, helpers_1.useEnvironment)('hardhat-project');
        it('Should add the newPath to the config', function () {
            chai_1.assert.equal(this.hre.config.paths.newPath, path_1.default.join(process.cwd(), 'asd'));
        });
    });
});
describe('Unit tests examples', function () {
    describe('ExampleHardhatRuntimeEnvironmentField', function () {
        describe('sayHello', function () {
            it('Should say hello', function () {
                const field = new ExampleHardhatRuntimeEnvironmentField_1.ExampleHardhatRuntimeEnvironmentField();
                chai_1.assert.equal(field.sayHello(), 'hello');
            });
        });
    });
});
//# sourceMappingURL=project.test.js.map