var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { task } from 'hardhat/config';
import { TASK_VERIFY } from '../task-names';
import { ChainBuilder } from '@usecannon/builder';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli/dist/src/constants';
task(TASK_VERIFY, 'Verify a package on Etherscan')
    .addPositionalParam('packageName', 'Name and version of the Cannon package to verify')
    .addOptionalParam('apiKey', 'Etherscan API key')
    .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
    .setAction(({ packageName, directory }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
    }
    const name = packageName.split(':')[0];
    const version = packageName.includes(':') ? packageName.split(':')[1] : 'latest';
    const builder = new ChainBuilder({
        name,
        version,
        readMode: 'metadata',
        chainId: (yield hre.ethers.provider.getNetwork()).chainId,
        provider: hre.ethers.provider,
        getSigner(addr) {
            return __awaiter(this, void 0, void 0, function* () {
                return hre.ethers.getSigner(addr);
            });
        },
        savedPackagesDir: directory,
    });
    const outputs = yield builder.getOutputs();
    if (!outputs) {
        throw new Error('No chain outputs found. Has the requested chain already been built?');
    }
    for (const c in outputs.contracts) {
        console.log('Verifying contract:', c);
        try {
            yield hre.run('verify:verify', {
                contract: `${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName}`,
                address: outputs.contracts[c].address,
                constructorArguments: outputs.contracts[c].constructorArgs || [],
            });
        }
        catch (err) {
            if (err.message.includes('Already Verified')) {
                console.log('Already verified');
            }
            else {
                throw err;
            }
        }
    }
}));
