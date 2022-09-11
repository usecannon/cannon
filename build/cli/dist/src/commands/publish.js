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
exports.publish = void 0;
const builder_1 = require("@usecannon/builder");
const ethers_1 = require("ethers");
const prompts_1 = __importDefault(require("prompts"));
const untildify_1 = __importDefault(require("untildify"));
const params_1 = require("../util/params");
function publish(cannonDirectory, privateKey, packageRef, tags, registryAddress, registryEndpoint, ipfsEndpoint, ipfsAuthorizationHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        cannonDirectory = (0, untildify_1.default)(cannonDirectory);
        const { name, version } = (0, params_1.parsePackageRef)(packageRef);
        const wallet = new ethers_1.ethers.Wallet(privateKey);
        const response = yield (0, prompts_1.default)({
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
        const registry = new builder_1.CannonRegistry({
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
exports.publish = publish;
