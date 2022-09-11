var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import path from 'node:path';
import { ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { green } from 'chalk';
import { findPackage } from '../helpers';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import createRegistry from '../registry';
export function deploy({ packageDefinition, cannonDirectory, projectDirectory, signer, provider, preset, dryRun, deploymentPath, prefix = '', registryAddress, registryRpcUrl, registryIpfsUrl, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { def } = findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version);
        const { chainId } = yield provider.getNetwork();
        const signerAddress = yield signer.getAddress();
        const getSigner = (addr) => {
            if (addr !== signerAddress) {
                throw new Error(`Looking for a signer different that the one configured: ${addr}`);
            }
            return Promise.resolve(signer);
        };
        const builder = new ChainBuilder({
            name: packageDefinition.name,
            version: packageDefinition.version,
            def,
            preset,
            readMode: 'metadata',
            writeMode: dryRun ? 'none' : 'metadata',
            provider,
            chainId,
            baseDir: projectDirectory,
            savedPackagesDir: cannonDirectory,
            getSigner,
            getDefaultSigner: () => Promise.resolve(signer),
        });
        const registry = createRegistry({
            registryAddress: registryAddress,
            registryRpc: registryRpcUrl,
            ipfsUrl: registryIpfsUrl,
        });
        const dependencies = yield builder.def.getRequiredImports(yield builder.populateSettings(packageDefinition.settings));
        for (const dependency of dependencies) {
            console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
            yield downloadPackagesRecursive(dependency.source, dependency.chainId, dependency.preset, registry, builder.provider, builder.packagesDir);
        }
        builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
        builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
        builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
        const outputs = yield builder.build(packageDefinition.settings);
        if (deploymentPath) {
            let relativePath = path.relative(process.cwd(), deploymentPath);
            if (!relativePath.startsWith('/')) {
                relativePath = './' + relativePath;
            }
            console.log(green(`Writing deployment artifacts to ${relativePath}\n`));
            yield writeModuleDeployments(deploymentPath, prefix, outputs);
        }
        printChainBuilderOutput(outputs);
        return { outputs };
    });
}
