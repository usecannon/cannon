import { resetHardhatContext } from 'hardhat/plugins-testing';
import path from 'path';
export function useEnvironment(fixtureProjectName) {
    beforeEach('Loading hardhat environment', function () {
        process.chdir(path.join(__dirname, 'fixture-projects', fixtureProjectName));
        this.hre = require('hardhat');
    });
    afterEach('Resetting hardhat', function () {
        resetHardhatContext();
    });
}
