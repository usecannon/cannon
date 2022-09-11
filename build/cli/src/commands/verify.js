var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ChainBuilder } from '@usecannon/builder';
import untildify from 'untildify';
import { getChainId, setupAnvil, execPromise } from '../helpers';
import { parsePackageRef } from '../util/params';
export function verify(packageRef, apiKey, network, cannonDirectory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        yield setupAnvil();
        const { name, version } = parsePackageRef(packageRef);
        cannonDirectory = untildify(cannonDirectory);
        const chainId = getChainId(network);
        const builder = new ChainBuilder({
            name,
            version,
            readMode: 'metadata',
            chainId: chainId,
            savedPackagesDir: cannonDirectory,
            provider: {},
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getSigner(_) {
                return __awaiter(this, void 0, void 0, function* () {
                    return new Promise(() => {
                        return null;
                    });
                });
            },
        });
        const outputs = yield builder.getOutputs();
        if (!outputs) {
            throw new Error('No chain outputs found. Has the requested chain already been built?');
        }
        for (const c in outputs.contracts) {
            console.log('Verifying contract:', c);
            try {
                const constructorArgs = (_a = outputs.contracts[c].constructorArgs) === null || _a === void 0 ? void 0 : _a.map((arg) => `"${arg}"`).join(' '); // might need to prepend the constructor signature
                yield execPromise(`forge verify-contract --chain-id ${chainId} --constructor-args $(cast abi-encode ${constructorArgs} ${outputs.contracts[c].address} ${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName} ${apiKey}`);
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
    });
}
