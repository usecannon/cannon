var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CannonRegistry } from '@usecannon/builder';
import { ethers } from 'ethers';
import prompts from 'prompts';
import untildify from 'untildify';
import { parsePackageRef } from '../util/params';
export function publish(cannonDirectory, privateKey, packageRef, tags, registryAddress, registryEndpoint, ipfsEndpoint, ipfsAuthorizationHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        cannonDirectory = untildify(cannonDirectory);
        const { name, version } = parsePackageRef(packageRef);
        const provider = new ethers.providers.JsonRpcProvider(registryEndpoint);
        const wallet = new ethers.Wallet(privateKey, provider);
        const response = yield prompts({
            type: 'confirm',
            name: 'confirmation',
            message: `This will deploy your package to IPFS and use ${wallet.address} to add the package to the registry. (This will cost a small amount of gas.) Continue?`,
            initial: true,
        });
        if (!response.confirmation) {
            process.exit();
        }
        const ipfsOptions = {
            url: ipfsEndpoint,
            headers: {
                authorization: ipfsAuthorizationHeader,
            },
        };
        const registry = new CannonRegistry({
            ipfsOptions,
            signerOrProvider: wallet,
            address: registryAddress,
        });
        const splitTags = tags.split(',');
        console.log(`Uploading and registering package ${name}:${version}...`);
        const txn = yield registry.uploadPackage(`${name}:${version}`, tags ? splitTags : undefined, cannonDirectory);
        console.log('txn:', txn.transactionHash, txn.status);
        console.log('Complete!');
    });
}
