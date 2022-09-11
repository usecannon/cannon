'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.associateTag =
    exports.importChain =
        exports.exportChain =
            exports.getActionFiles =
                exports.clearDeploymentInfo =
                    exports.putDeploymentInfo =
                        exports.getDeploymentInfo =
                            exports.getAllDeploymentInfos =
                                exports.getDeploymentInfoFile =
                                    exports.getChartDir =
                                        exports.getSavedChartsDir =
                                            void 0;
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));
const adm_zip_1 = __importDefault(require('adm-zip'));
const lodash_1 = __importDefault(require('lodash'));
const DEPLOY_FILE_INDENTATION = 4;
function getSavedChartsDir() {
    if (process.env.HOME) {
        // sane path for posix like systems
        return path_1.default.join(process.env.HOME, '.local', 'cannon');
    }
    else {
        // todo
        throw new Error('could not resolve cannon saved charts dir');
    }
}
exports.getSavedChartsDir = getSavedChartsDir;
function getChartDir(chartsDir, name, version) {
    return path_1.default.join(chartsDir, name, version);
}
exports.getChartDir = getChartDir;
function getDeploymentInfoFile(chartDir) {
    return path_1.default.join(chartDir, 'deploy.json');
}
exports.getDeploymentInfoFile = getDeploymentInfoFile;
function getAllDeploymentInfos(chartDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = getDeploymentInfoFile(chartDir);
        if (!fs_extra_1.default.existsSync(file)) {
            return { deploys: {}, misc: { ipfsHash: '' }, def: { name: '', version: '' } };
        }
        return yield fs_extra_1.default.readJson(file);
    });
}
exports.getAllDeploymentInfos = getAllDeploymentInfos;
function getDeploymentInfo(chartDir, network, label) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployInfo = yield getAllDeploymentInfos(chartDir);
        return lodash_1.default.get(deployInfo.deploys, `${network}.${label}`, null);
    });
}
exports.getDeploymentInfo = getDeploymentInfo;
function putDeploymentInfo(chartDir, chainId, label, info) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployInfo = yield getAllDeploymentInfos(chartDir);
        lodash_1.default.set(deployInfo.deploys, `${chainId}.${label}`, info);
        yield fs_extra_1.default.writeFile(getDeploymentInfoFile(chartDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
    });
}
exports.putDeploymentInfo = putDeploymentInfo;
function clearDeploymentInfo(chartDir, chainId, label) {
    return __awaiter(this, void 0, void 0, function* () {
        // delete associated files
        const prefix = `${chainId}-${label}`;
        for (const file in fs_extra_1.default.readdir(chartDir)) {
            if (file.startsWith(prefix)) {
                yield fs_extra_1.default.rm(path_1.default.join(chartDir, file));
            }
        }
        // delete entry in deploy file
        const deployInfo = yield getAllDeploymentInfos(chartDir);
        delete deployInfo.deploys[chainId.toString()][label];
        yield fs_extra_1.default.writeFile(getDeploymentInfoFile(chartDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
    });
}
exports.clearDeploymentInfo = clearDeploymentInfo;
function getActionFiles(chartDir, chainId, label, stepName) {
    const filename = `${chainId}-${label}/${stepName}`;
    const basename = path_1.default.join(chartDir, filename);
    return {
        chain: basename + '.chain',
        metadata: basename + '.json',
        basename,
    };
}
exports.getActionFiles = getActionFiles;
function exportChain(chartsDir, name, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = new adm_zip_1.default();
        const folder = getChartDir(chartsDir, name, version);
        yield zip.addLocalFolderPromise(folder, {});
        return zip.toBufferPromise();
    });
}
exports.exportChain = exportChain;
function importChain(chartsDir, buf) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = new adm_zip_1.default(buf);
        const manifest = JSON.parse(zip.readAsText('deploy.json'));
        // manifest determines where to store the files
        const dir = getChartDir(chartsDir, manifest.def.name, manifest.def.version);
        yield zip.extractAllTo(dir, true);
        return manifest.def;
    });
}
exports.importChain = importChain;
function associateTag(chartsDir, name, version, tag) {
    return __awaiter(this, void 0, void 0, function* () {
        const mainCacheDir = getChartDir(chartsDir, name, version);
        const tagCacheDir = getChartDir(chartsDir, name, tag);
        if (!(yield fs_extra_1.default.pathExists(mainCacheDir))) {
            throw new Error(`could not associate tag: cache dir for ${name}:${version} does not exist`);
        }
        if (version === tag) {
            return;
        }
        if (yield fs_extra_1.default.pathExists(tagCacheDir)) {
            yield fs_extra_1.default.unlink(tagCacheDir);
        }
        yield fs_extra_1.default.symlink(mainCacheDir, tagCacheDir);
    });
}
exports.associateTag = associateTag;
