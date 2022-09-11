"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REGISTRY_ADDRESS = exports.DEFAULT_REGISTRY_ENDPOINT = exports.DEFAULT_REGISTRY_IPFS_ENDPOINT = exports.DEFAULT_CANNON_DIRECTORY = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
exports.DEFAULT_CANNON_DIRECTORY = node_path_1.default.join(node_os_1.default.homedir(), '.local', 'share', 'cannon');
exports.DEFAULT_REGISTRY_IPFS_ENDPOINT = 'https://usecannon.infura-ipfs.io';
exports.DEFAULT_REGISTRY_ENDPOINT = 'https://cloudflare-eth.com/v1/mainnet';
exports.DEFAULT_REGISTRY_ADDRESS = '0xA98BE35415Dd28458DA4c1C034056766cbcaf642';
