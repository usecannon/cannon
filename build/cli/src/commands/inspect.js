var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _ from 'lodash';
import { ChainDefinition, getAllDeploymentInfos } from '@usecannon/builder';
import { bold, cyan, gray, green, magenta, red } from 'chalk';
import { parsePackageRef } from '../util/params';
import { getChainName } from '../helpers';
export function inspect(cannonDirectory, packageRef, json) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, version } = parsePackageRef(packageRef);
        if (version === 'latest') {
            // TODO fetch the current latest version from the registry?
            throw new Error(`You must specify a valid package version, given: "${version}"`);
        }
        const deployInfo = yield getAllDeploymentInfos(cannonDirectory);
        const chainDefinition = new ChainDefinition(deployInfo.def);
        if (json) {
            console.log(JSON.stringify(deployInfo, null, 2));
        }
        else {
            console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
            console.log(cyan(chainDefinition.printTopology().join('\n')));
            if (!_.isEmpty(deployInfo === null || deployInfo === void 0 ? void 0 : deployInfo.deploys)) {
                for (const [chainId, chainData] of Object.entries(deployInfo.deploys)) {
                    const chainName = getChainName(parseInt(chainId));
                    renderDeployment(chainName, chainId, chainData);
                }
            }
            else {
                console.log('This package has not been built for any chains yet.');
            }
        }
        return deployInfo;
    });
}
function renderDeployment(chainName, chainId, chainData) {
    console.log('\n' + magenta(bold(chainName || '')) + ' ' + gray(`(Chain ID: ${chainId})`));
    console.log('\nPresets');
    for (const [presetName, presetData] of Object.entries(chainData)) {
        renderPreset(presetName, presetData);
    }
    console.log(gray('\n--------------------------------------------------------'));
}
function renderPreset(presetName, presetData) {
    console.log(`${bold(cyan(presetName))}${presetName == 'main' ? gray(' [DEFAULT]') : ''}`);
    if (presetData.ipfsHash.length) {
        console.log('> ✅ Published to the registry, IPFS hash: ' + presetData.ipfsHash);
    }
    else {
        console.log('> ' + bold(red('⚠️  Not published to the registry')));
    }
    if (Object.keys(presetData.options).length !== 0) {
        console.log(gray('> Options'));
        console.log(JSON.stringify(presetData.options, null, 2));
    }
}
