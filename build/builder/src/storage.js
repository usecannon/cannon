var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import os from 'node:os';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import _ from 'lodash';
const DEPLOY_FILE_INDENTATION = 4;
export function getSavedPackagesDir() {
    return path.join(os.homedir(), '.local', 'share', 'cannon');
}
export function getPackageDir(packagesDir, name, version) {
    return path.join(packagesDir, name, version);
}
export function getDeploymentInfoFile(packageDir) {
    return path.join(packageDir, 'deploy.json');
}
export function getAllDeploymentInfos(packageDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = getDeploymentInfoFile(packageDir);
        if (!fs.existsSync(file)) {
            return { deploys: {}, pkg: {}, misc: { ipfsHash: '' }, def: { name: '', version: '' } };
        }
        return (yield fs.readJson(file));
    });
}
export function getDeploymentInfo(packageDir, network, label) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployInfo = yield getAllDeploymentInfos(packageDir);
        return _.get(deployInfo.deploys, `${network}.${label}`, null);
    });
}
export function putDeploymentInfo(packageDir, chainId, label, info) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployInfo = yield getAllDeploymentInfos(packageDir);
        _.set(deployInfo.deploys, `${chainId}.${label}`, info);
        yield fs.writeFile(getDeploymentInfoFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
    });
}
export function clearDeploymentInfo(packageDir, chainId, label) {
    return __awaiter(this, void 0, void 0, function* () {
        // delete associated files
        const prefix = `${chainId}-${label}`;
        for (const file in fs.readdir(packageDir)) {
            if (file.startsWith(prefix)) {
                yield fs.rm(path.join(packageDir, file));
            }
        }
        // delete entry in deploy file
        const deployInfo = yield getAllDeploymentInfos(packageDir);
        delete deployInfo.deploys[chainId.toString()][label];
        yield fs.writeFile(getDeploymentInfoFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
    });
}
export function getActionFiles(packageDir, chainId, label, stepName) {
    const filename = `${chainId}-${label}/${stepName}`;
    const basename = path.join(packageDir, filename);
    return {
        chain: basename + '.chain',
        metadata: basename + '.json',
        basename,
    };
}
export function exportChain(packagesDir, name, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = new AdmZip();
        const folder = getPackageDir(packagesDir, name, version);
        yield zip.addLocalFolderPromise(folder, {});
        return zip.toBufferPromise();
    });
}
export function importChain(packagesDir, buf) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = new AdmZip(buf);
        const manifest = JSON.parse(zip.readAsText('deploy.json'));
        // manifest determines where to store the files
        const dir = getPackageDir(packagesDir, manifest.def.name, manifest.def.version);
        yield zip.extractAllTo(dir, true);
        return manifest.def;
    });
}
export function associateTag(packagesDir, name, version, tag) {
    return __awaiter(this, void 0, void 0, function* () {
        const mainCacheDir = getPackageDir(packagesDir, name, version);
        const tagCacheDir = getPackageDir(packagesDir, name, tag);
        if (!(yield fs.pathExists(mainCacheDir))) {
            throw new Error(`could not associate tag: cache dir for ${name}:${version} does not exist`);
        }
        if (version === tag) {
            return;
        }
        if (yield fs.pathExists(tagCacheDir)) {
            yield fs.unlink(tagCacheDir);
        }
        yield fs.symlink(mainCacheDir, tagCacheDir);
    });
}
