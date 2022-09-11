var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import path from 'path';
import { existsSync } from 'fs-extra';
import { ChainDefinition } from './definition';
import { getSavedPackagesDir, getActionFiles, getPackageDir, getAllDeploymentInfos } from './storage';
import semver from 'semver';
import pkg from '../package.json';
export { ChainDefinition, validateChainDefinition } from './definition';
export { ChainBuilder, Events } from './builder';
export * from './types';
export * from './storage';
export * from './error/provider';
export { CannonRegistry } from './registry';
export function downloadPackagesRecursive(pkg, chainId, preset, registry, provider, packagesDir) {
    return __awaiter(this, void 0, void 0, function* () {
        packagesDir = packagesDir || getSavedPackagesDir();
        const [name, tag] = pkg.split(':');
        const depdir = path.dirname(getActionFiles(getPackageDir(packagesDir, name, tag), chainId, preset || 'main', 'sample').basename);
        if (!existsSync(depdir)) {
            yield registry.downloadPackageChain(pkg, chainId, preset || 'main', packagesDir);
            const info = yield getAllDeploymentInfos(depdir);
            const def = new ChainDefinition(info.def);
            const dependencies = def.getRequiredImports({
                package: info.pkg,
                chainId,
                timestamp: '0',
                settings: {},
                contracts: {},
                txns: {},
                imports: {},
            });
            for (const dependency of dependencies) {
                yield downloadPackagesRecursive(dependency.source, dependency.chainId, dependency.preset, registry, provider, packagesDir);
            }
        }
    });
}
// nodejs version check
if (!semver.satisfies(process.version, pkg.engines.node)) {
    throw new Error(`Cannon requires Node.js ${pkg.engines.node} but your current version is ${process.version}`);
}
