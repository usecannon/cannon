var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import crypto from 'crypto';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
export const ChainDefinitionScriptSchema = {
    properties: {
        exec: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } },
    },
};
export function hashFs(path) {
    const dirHasher = crypto.createHash('sha256');
    // iterate through every file at path and build a checksum
    if (fs.statSync(path).isFile()) {
        const hasher = crypto.createHash('sha256');
        dirHasher.update(hasher.update(fs.readFileSync(path)).digest());
    }
    else {
        const subpaths = fs.readdirSync(path);
        for (const subpath of subpaths) {
            const fullname = `${path}/${subpath}`;
            dirHasher.update(hashFs(fullname));
        }
    }
    return dirHasher.digest();
}
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
export function getExecutionSigner(provider, txn, salt = '') {
    return __awaiter(this, void 0, void 0, function* () {
        const hasher = crypto.createHash('sha256');
        // create a hashable string out of relevant properties
        const seed = (txn.to || '') + txn.data + (txn.value || '') + Buffer.from(salt || '', 'utf8').toString('hex');
        const size = 32;
        for (let i = 0; i < seed.length; i += size) {
            hasher.update(seed.substr(i, size));
        }
        const hash = hasher.digest('hex');
        const address = '0x' + hash.slice(0, 40);
        yield provider.send('hardhat_impersonateAccount', [address]);
        yield provider.send('hardhat_setBalance', [address, ethers.utils.parseEther('10000').toHexString()]);
        return yield provider.getSigner(address);
    });
}
/**
 * Loads an artifact from the internal cannon storage.
 * @param name name of the cached contract artifact
 */
export function getStoredArtifact(packageDir, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactFile = path.join(packageDir, 'contracts', name + '.json');
        const artifactContent = yield fs.readFile(artifactFile);
        const artifactData = JSON.parse(artifactContent.toString());
        if (!artifactData) {
            throw new Error(`Artifact not saved for "${name}"`);
        }
        return artifactData;
    });
}
export function passThroughArtifact(packageDir, getArtifact, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactFile = path.join(packageDir, 'contracts', name + '.json');
        const artifact = yield getArtifact(name);
        yield fs.mkdirp(path.dirname(artifactFile));
        yield fs.writeFile(artifactFile, JSON.stringify(artifact));
        return artifact;
    });
}
export function clearArtifacts(packageDir) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs.rm(packageDir, { recursive: true });
    });
}
export function getContractFromPath(ctx, path) {
    var _a;
    const pathPieces = path.split('.');
    let importsBase = ctx;
    for (const p of pathPieces.slice(0, -1)) {
        importsBase = ctx.imports[p];
    }
    const c = (_a = importsBase === null || importsBase === void 0 ? void 0 : importsBase.contracts) === null || _a === void 0 ? void 0 : _a[pathPieces[pathPieces.length - 1]];
    if (c) {
        return new ethers.Contract(c.address, c.abi);
    }
    return null;
}
export function getAllContractPaths(ctx) {
    return [
        ...Object.keys(ctx.contracts || {}),
        ..._.sortBy(_.flatMap(ctx.imports, (v, k) => getAllContractPaths(v).map((c) => `${k}.${c}`))),
    ];
}
export function printInternalOutputs(outputs) {
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
export function printChainDefinitionProblems(problems, def) {
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
