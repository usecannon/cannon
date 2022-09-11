var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _ from 'lodash';
import { ethers } from 'ethers';
import { table } from 'table';
import { bold, greenBright, green, dim } from 'chalk';
import tildify from 'tildify';
import { ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { loadCannonfile } from '../helpers';
import { runRpc, getProvider } from '../rpc';
import { printChainBuilderOutput } from '../util/printer';
import createRegistry from '../registry';
export function build({ cannonfilePath, settings, getArtifact, cannonDirectory, projectDirectory, preset = 'main', forkUrl, chainId = 31337, registryIpfsUrl, registryRpcUrl, registryAddress, wipe = false, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { def, name, version } = loadCannonfile(cannonfilePath);
        if (!version) {
            throw new Error(`Missing "version" definition on ${cannonfilePath}`);
        }
        const defSettings = def.getSettings();
        if (!settings && defSettings && !_.isEmpty(defSettings)) {
            const displaySettings = Object.entries(defSettings).map((setting) => [
                setting[0],
                setting[1].defaultValue || dim('No default value'),
                setting[1].description || dim('No description'),
            ]);
            console.log('This package can be built with custom settings.');
            console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
            console.log('\nSETTINGS:');
            console.log(table([[bold('Name'), bold('Default Value'), bold('Description')], ...displaySettings]));
        }
        if (!_.isEmpty(settings)) {
            console.log(green(`Creating preset ${bold(preset)} with the following settings: ` +
                Object.entries(settings)
                    .map((setting) => `${setting[0]}=${setting[1]}`)
                    .join(' ')));
        }
        const readMode = wipe ? 'none' : 'metadata';
        const writeMode = 'all';
        const node = yield runRpc({
            forkUrl,
            port: 8545,
        });
        const provider = yield getProvider(node);
        const builder = new ChainBuilder({
            name,
            version,
            def,
            preset,
            readMode,
            writeMode,
            provider,
            chainId,
            baseDir: projectDirectory,
            savedPackagesDir: cannonDirectory,
            getSigner(addr) {
                return __awaiter(this, void 0, void 0, function* () {
                    // on test network any user can be conjured
                    yield provider.send('hardhat_impersonateAccount', [addr]);
                    yield provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
                    return provider.getSigner(addr);
                });
            },
            getArtifact,
        });
        const registry = createRegistry({
            registryAddress: registryAddress,
            registryRpc: registryRpcUrl,
            ipfsUrl: registryIpfsUrl,
        });
        const dependencies = yield builder.def.getRequiredImports(yield builder.populateSettings(settings));
        for (const dependency of dependencies) {
            console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
            yield downloadPackagesRecursive(dependency.source, dependency.chainId, dependency.preset, registry, provider, builder.packagesDir);
        }
        builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
        builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
        builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
        const outputs = yield builder.build(settings);
        printChainBuilderOutput(outputs);
        console.log(greenBright(`Successfully built package ${bold(`${name}:${version}`)} to ${bold(tildify(cannonDirectory))}`));
        // TODO: Update logging
        // Run this on a local node with <command>
        // Deploy it to a remote network with <command>
        // Publish your package to the registry with <command>
        node.kill();
        return { outputs, provider };
    });
}
