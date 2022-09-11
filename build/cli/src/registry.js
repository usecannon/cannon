var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { CannonRegistry } from '@usecannon/builder';
export default function createRegistry({ registryAddress, ipfsUrl, registryRpc }) {
    const parsedIpfs = new URL(ipfsUrl);
    return new ReadOnlyCannonRegistry({
        address: registryAddress,
        signerOrProvider: new ethers.providers.JsonRpcProvider(registryRpc),
        ipfsOptions: {
            protocol: parsedIpfs.protocol.slice(0, parsedIpfs.protocol.length - 1),
            host: parsedIpfs.host,
            port: parsedIpfs.port ? parseInt(parsedIpfs.port) : parsedIpfs.protocol === 'https:' ? 443 : 80,
        },
    });
}
class ReadOnlyCannonRegistry extends CannonRegistry {
    constructor(opts) {
        super(opts);
        this.ipfsOptions = opts.ipfsOptions;
    }
    readIpfs(urlOrHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = urlOrHash.replace(/^ipfs:\/\//, '');
            const result = yield fetch(`${this.ipfsOptions.protocol}://${this.ipfsOptions.host}:${this.ipfsOptions.port}/ipfs/${hash}`);
            return yield result.buffer();
        });
    }
}
