"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const node_fetch_1 = __importDefault(require("node-fetch"));
const builder_1 = require("@usecannon/builder");
function createRegistry({ registryAddress, ipfsUrl, registryRpc }) {
    const parsedIpfs = new URL(ipfsUrl);
    return new ReadOnlyCannonRegistry({
        address: registryAddress,
        signerOrProvider: new ethers_1.ethers.providers.JsonRpcProvider(registryRpc),
        ipfsOptions: {
            protocol: parsedIpfs.protocol.slice(0, parsedIpfs.protocol.length - 1),
            host: parsedIpfs.host,
            port: parsedIpfs.port ? parseInt(parsedIpfs.port) : parsedIpfs.protocol === 'https:' ? 443 : 80,
        },
    });
}
exports.default = createRegistry;
class ReadOnlyCannonRegistry extends builder_1.CannonRegistry {
    constructor(opts) {
        super(opts);
        this.ipfsOptions = opts.ipfsOptions;
    }
    readIpfs(urlOrHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const hash = urlOrHash.replace(/^ipfs:\/\//, '');
            const result = yield (0, node_fetch_1.default)(`${this.ipfsOptions.protocol}://${this.ipfsOptions.host}:${this.ipfsOptions.port}/ipfs/${hash}`);
            return yield result.buffer();
        });
    }
}
