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
exports.printChainDefinitionProblems = exports.printInternalOutputs = exports.getAllContractPaths = exports.getContractFromPath = exports.clearArtifacts = exports.passThroughArtifact = exports.getStoredArtifact = exports.getExecutionSigner = exports.hashFs = exports.ChainDefinitionScriptSchema = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ethers_1 = require("ethers");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
exports.ChainDefinitionScriptSchema = {
    properties: {
        exec: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } },
    },
};
function hashFs(path) {
    const dirHasher = crypto_1.default.createHash('sha256');
    // iterate through every file at path and build a checksum
    if (fs_extra_1.default.statSync(path).isFile()) {
        const hasher = crypto_1.default.createHash('sha256');
        dirHasher.update(hasher.update(fs_extra_1.default.readFileSync(path)).digest());
    }
    else {
        const subpaths = fs_extra_1.default.readdirSync(path);
        for (const subpath of subpaths) {
            const fullname = `${path}/${subpath}`;
            dirHasher.update(hashFs(fullname));
        }
    }
    return dirHasher.digest();
}
exports.hashFs = hashFs;
/**
 * Used as the `getDefaultSigner` implementation if none is specified to the chain builder. Creates a new
 * usable signer on the fly and attempts to populate it with hardhat functions `impersonateAccount`.
 * This will fail if running on a live network, so be sure to set your own `getDefaultSigner` if that
 * situation applies to you.
 * @param provider the provider set on the chain builder
 * @param txn the transaction that is to be executed
 * @param seed additional text which can be used to execute the same transaction with different addresses
 * @returns ethers signer
 */
function getExecutionSigner(provider, txn, salt = '') {
    return __awaiter(this, void 0, void 0, function* () {
        const hasher = crypto_1.default.createHash('sha256');
        // create a hashable string out of relevant properties
        const seed = (txn.to || '') + txn.data + (txn.value || '') + Buffer.from(salt || '', 'utf8').toString('hex');
        const size = 32;
        for (let i = 0; i < seed.length; i += size) {
            hasher.update(seed.substr(i, size));
        }
        const hash = hasher.digest('hex');
        const address = '0x' + hash.slice(0, 40);
        yield provider.send('hardhat_impersonateAccount', [address]);
        yield provider.send('hardhat_setBalance', [address, ethers_1.ethers.utils.parseEther('10000').toHexString()]);
        return yield provider.getSigner(address);
    });
}
exports.getExecutionSigner = getExecutionSigner;
/**
 * Loads an artifact from the internal cannon storage.
 * @param name name of the cached contract artifact
 */
function getStoredArtifact(packageDir, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactFile = path_1.default.join(packageDir, 'contracts', name + '.json');
        const artifactContent = yield fs_extra_1.default.readFile(artifactFile);
        const artifactData = JSON.parse(artifactContent.toString());
        if (!artifactData) {
            throw new Error(`Artifact not saved for "${name}"`);
        }
        return artifactData;
    });
}
exports.getStoredArtifact = getStoredArtifact;
function passThroughArtifact(packageDir, getArtifact, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactFile = path_1.default.join(packageDir, 'contracts', name + '.json');
        const artifact = yield getArtifact(name);
        yield fs_extra_1.default.mkdirp(path_1.default.dirname(artifactFile));
        yield fs_extra_1.default.writeFile(artifactFile, JSON.stringify(artifact));
        return artifact;
    });
}
exports.passThroughArtifact = passThroughArtifact;
function clearArtifacts(packageDir) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_extra_1.default.rm(packageDir, { recursive: true });
    });
}
exports.clearArtifacts = clearArtifacts;
function getContractFromPath(ctx, path) {
    var _a;
    const pathPieces = path.split('.');
    let importsBase = ctx;
    for (const p of pathPieces.slice(0, -1)) {
        importsBase = ctx.imports[p];
    }
    const c = (_a = importsBase === null || importsBase === void 0 ? void 0 : importsBase.contracts) === null || _a === void 0 ? void 0 : _a[pathPieces[pathPieces.length - 1]];
    if (c) {
        return new ethers_1.ethers.Contract(c.address, c.abi);
    }
    return null;
}
exports.getContractFromPath = getContractFromPath;
function getAllContractPaths(ctx) {
    return [
        ...Object.keys(ctx.contracts || {}),
        ...lodash_1.default.sortBy(lodash_1.default.flatMap(ctx.imports, (v, k) => getAllContractPaths(v).map((c) => `${k}.${c}`))),
    ];
}
exports.getAllContractPaths = getAllContractPaths;
function printInternalOutputs(outputs) {
    for (const c in outputs.contracts) {
        console.log(`deployed\t${c} at ${outputs.contracts[c].address} (${outputs.contracts[c].deployTxnHash})`);
    }
    for (const t in outputs.txns) {
        const txn = outputs.txns[t];
        console.log(`execed\t${t} (${txn.hash})`);
        // decode events
        for (const n in txn.events) {
            for (const e of txn.events[n]) {
                console.log(`\t-> ${n}(${e.args.map((s) => s.toString()).join(',')})`);
            }
        }
        console.log();
    }
}
exports.printInternalOutputs = printInternalOutputs;
function printChainDefinitionProblems(problems, def) {
    let counter = 1;
    const str = [];
    for (const missing of problems.missing) {
        str.push(`${counter}: In action "${missing.action}", the dependency "${missing.dependency}" is not defined elsewhere.`);
        counter++;
    }
    if (problems.missing.length && def) {
        str.push(`HELP: The following is the full list of known actions:
${def.allActionNames.join('\n')}`);
    }
    for (const cycle of problems.cycles) {
        str.push(`${counter}: The actions ${cycle.join(', ')} form a dependency cycle and therefore cannot be deployed.`);
        counter++;
    }
    for (const extraneous of problems.extraneous) {
        str.push(`${counter}: The action ${extraneous.node} defines an unnecessary dependency ${extraneous.extraneous} (a sub-dependency of ${extraneous.inDep}). Please remove this unnecessary dependency.`);
    }
    return str.join('\n');
}
exports.printChainDefinitionProblems = printChainDefinitionProblems;
