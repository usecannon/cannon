var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import path from 'path';
import { ethers } from 'ethers';
import { associateTag } from './storage';
import fs from 'fs-extra';
import { getAllDeploymentInfos, getPackageDir, getDeploymentInfoFile, getActionFiles, getSavedPackagesDir } from '.';
import { create } from 'ipfs-http-client';
import AdmZip from 'adm-zip';
import CannonRegistryAbi from './abis/CannonRegistry.json';
export class CannonRegistry {
    constructor({ address, ipfsOptions = {}, signerOrProvider, }) {
        if (signerOrProvider.provider) {
            this.signer = signerOrProvider;
            this.provider = this.signer.provider;
        }
        else {
            this.provider = signerOrProvider;
        }
        this.contract = new ethers.Contract(address, CannonRegistryAbi, this.provider);
        this.ipfs = create(ipfsOptions);
    }
    publish(name, version, tags, url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            if (!this.signer) {
                throw new Error('Missing signer needed for publishing');
            }
            if ((yield this.signer.getBalance()).lte(0)) {
                throw new Error(`Signer at address ${yield this.signer.getAddress()} is not funded with ETH. Please ensure you have ETH in your wallet in order to publish.`);
            }
            const tx = yield this.contract.connect(this.signer).publish(ethers.utils.formatBytes32String(name), ethers.utils.formatBytes32String(version), tags.map((t) => ethers.utils.formatBytes32String(t)), url);
            return yield tx.wait();
        });
    }
    getUrl(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            return yield this.contract.getPackageUrl(ethers.utils.formatBytes32String(name), ethers.utils.formatBytes32String(version));
        });
    }
    readIpfs(urlOrHash) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            const hash = urlOrHash.replace(/^ipfs:\/\//, '');
            const bufs = [];
            try {
                for (var _b = __asyncValues(this.ipfs.cat(hash)), _c; _c = yield _b.next(), !_c.done;) {
                    const chunk = _c.value;
                    bufs.push(chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return Buffer.concat(bufs);
        });
    }
    queryDeploymentInfo(name, tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.getUrl(name, tag);
            if (!url) {
                return null;
            }
            const manifestData = yield this.readIpfs(url);
            return JSON.parse(manifestData.toString('utf8'));
        });
    }
    downloadPackageChain(image, chainId, preset, packagesDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const [name, tag] = image.split(':');
            preset = preset !== null && preset !== void 0 ? preset : 'main';
            const manifest = yield this.queryDeploymentInfo(name, tag);
            if (!manifest) {
                throw new Error(`package not found: ${name}:${tag}. please check that the requested package exists and try again.`);
            }
            const packageDir = getPackageDir(packagesDir || getSavedPackagesDir(), manifest.def.name, manifest.def.version);
            yield fs.mkdirp(packageDir);
            yield fs.writeJson(getDeploymentInfoFile(packageDir), manifest);
            if (!manifest.deploys[chainId.toString()] || !manifest.deploys[chainId][preset]) {
                // if we have manifest but no chain files, treat it as undeployed build
                return null;
            }
            // whats nice about this is it will import to the actual directory it belongs to so we can link it later
            const buf = yield this.readIpfs(manifest.deploys[chainId.toString()][preset].ipfsHash);
            const zip = new AdmZip(buf);
            const dir = path.dirname(getActionFiles(packageDir, chainId, preset, 'sample').basename);
            yield zip.extractAllTo(dir, true);
            const miscBuf = yield this.readIpfs(manifest.misc.ipfsHash);
            const miscZip = new AdmZip(miscBuf);
            yield miscZip.extractAllTo(packageDir, true);
            // imported chain may be of a different version from the actual requested tag. Make sure we link if necessary
            yield associateTag(packagesDir || getSavedPackagesDir(), manifest.def.name, manifest.def.version, tag);
            return manifest.deploys[chainId.toString()][preset];
        });
    }
    uploadPackage(image, tags, packagesDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const [name, tag] = image.split(':');
            packagesDir = packagesDir || getSavedPackagesDir();
            const packageDir = getPackageDir(packagesDir, name, tag);
            const manifest = yield getAllDeploymentInfos(packageDir);
            if (!manifest) {
                throw new Error('package not found for upload ' + image);
            }
            // start uploading everything
            for (const chainId in manifest.deploys) {
                for (const preset in manifest.deploys[chainId]) {
                    const zip = new AdmZip();
                    const folder = path.dirname(getActionFiles(packageDir, parseInt(chainId), preset, 'sample').basename);
                    yield zip.addLocalFolderPromise(folder, {});
                    const buf = yield zip.toBufferPromise();
                    const ipfsInfo = yield this.ipfs.add(buf);
                    // update IPFS hashes as we go
                    manifest.deploys[chainId][preset].ipfsHash = ipfsInfo.cid.toV0().toString();
                }
            }
            // upload the misc artifacts
            const miscZip = new AdmZip();
            // contracts may not be deployed in which case, contracts folder is not created
            if (fs.existsSync(path.join(packageDir, 'contracts'))) {
                yield miscZip.addLocalFolderPromise(path.join(packageDir, 'contracts'), { zipPath: 'contracts' });
            }
            const miscIpfsInfo = yield this.ipfs.add(yield miscZip.toBufferPromise());
            manifest.misc = { ipfsHash: miscIpfsInfo.cid.toV0().toString() };
            // final manifest upload
            const manifestIpfsInfo = yield this.ipfs.add(JSON.stringify(manifest));
            return yield this.publish(name, manifest.def.version, tags || ['latest'], 'ipfs://' + manifestIpfsInfo.cid.toV0().toString());
        });
    }
}
