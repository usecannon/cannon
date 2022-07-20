import _ from 'lodash';
import path from 'path';
import { task, types } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';

import { build } from '@usecannon/cli';
import loadCannonfile from '../internal/load-cannonfile';
import { CannonRegistry, ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { SUBTASK_RPC, SUBTASK_WRITE_DEPLOYMENTS, TASK_BUILD } from '../task-names';
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { ethers } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { bold, green, greenBright, dim } from 'chalk';
import { table } from 'table';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .addOptionalParam('file', 'TOML definition of the chain to assemble', 'cannonfile.toml')
  .addOptionalParam('preset', 'Specify the preset label the given settings should be applied', 'main')
  .addOptionalVariadicPositionalParam('settings', 'Key values of chain which should be built')
  .setAction(async ({ noCompile, file, settings, preset }, hre) => {
    if (!noCompile) {
      await hre.run(TASK_COMPILE);
      console.log('');
    }

    const filepath = path.resolve(hre.config.paths.root, file);
    build(filepath, preset, settings, hre.artifacts.readArtifact, hre.config.paths.cannon, hre.config.paths.root);

    /*
    const filepath = path.resolve(hre.config.paths.root, file);

<<<<<<< HEAD
    const def = loadCannonfile(hre, filepath);

    if (!settings && !_.isEmpty(def.setting)) {
      let displaySettings = Object.entries(def.setting).map((setting: Array<any>) => {
        let settingRow: Array<any> = [
          setting[0],
          setting[1].defaultValue || dim('No default value'),
          setting[1].description || dim('No description'),
        ];
        return settingRow;
      });
      console.log('This package can be built with custom settings.');
      console.log(dim(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
      console.log('\nSETTINGS:');
      displaySettings.unshift([bold('Name'), bold('Default Value'), bold('Description')]);
      console.log(table(displaySettings));
    }

    // options can be passed through commandline, or environment
    const mappedSettings: { [key: string]: string } = _.fromPairs((settings || []).map((kv: string) => kv.split('=')));

    if (!_.isEmpty(mappedSettings)) {
      console.log(
        green(
          `Creating preset ${bold(preset)} with the following settings: ` +
            Object.entries(mappedSettings)
              .map((setting) => `${setting[0]}=${setting[1]}`)
              .join(' ')
        )
      );
    }

    const { name, version } = def;
=======
    // options can be passed through commandline, or environment
    const mappedOptions: { [key: string]: string } = _.fromPairs((options || []).map((kv: string) => kv.split('=')));
    const { def, name, version } = loadCannonfile(hre, filepath);
>>>>>>> 892450c (fix rest of the bugs)

    let builder: ChainBuilder;
    if (dryRun) {
      const network = hre.network;

      if (!network) throw new Error('Selected dryRun network not found in hardhat configuration');

      if (!network.config.chainId) throw new Error('Selected network must have chainId set in hardhat configuration');

      const provider = await hre.run(SUBTASK_RPC, {
        forkUrl: (hre.config.networks[network.name] as HttpNetworkConfig).url,
        port: port || 8545,
        chainId: network.config.chainId,
      });

      let wallets: ethers.Wallet[] = [];
      if (_.isArray(hre.network.config.accounts)) {
        wallets = hre.network.config.accounts.map((account) => new ethers.Wallet(account as string, provider));
      } else {
        const hdAccounts = hre.network.config.accounts as HttpNetworkHDAccountsConfig;
        for (let i = 0; i < hdAccounts.count; i++) {
          wallets.push(ethers.Wallet.fromMnemonic(hdAccounts.path + `/${i + hdAccounts.initialIndex}`, hdAccounts.mnemonic));
        }
      }

      builder = new ChainBuilder({
        name,
        version,
        def,
        preset,

        readMode: wipe ? 'none' : 'metadata',
        writeMode: 'none',

        chainId: network.config.chainId,
        provider,
        baseDir: hre.config.paths.root,
        savedPackagesDir: hre.config.paths.cannon,
        async getSigner(addr: string) {
          const foundWallet = wallets.find((wallet) => wallet.address == addr);
          if (!foundWallet) {
            throw new Error(
              `You haven't provided the private key for signer ${addr}. Please check your Hardhat configuration and try again. List of known addresses: ${wallets
                .map((w) => w.address)
                .join(', ')}`
            );
          }
          return foundWallet;
        },

        async getDefaultSigner() {
          return wallets[0];
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    } else if (hre.network.name === 'hardhat') {
      // clean hardhat network build
      const provider = await hre.run(SUBTASK_RPC, { port: port || 8545 });

      builder = new ChainBuilder({
        name,
        version,
        def,
        preset,

        readMode: wipe ? 'none' : 'all',
        writeMode: 'all',

        provider,
        chainId: 31337,
        baseDir: hre.config.paths.root,
        savedPackagesDir: hre.config.paths.cannon,
        async getSigner(addr: string) {
          // on test network any user can be conjured
          await provider.send('hardhat_impersonateAccount', [addr]);
          await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
          return provider.getSigner(addr);
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    } else {
      // deploy to live network
      builder = new ChainBuilder({
        name,
        version,
        def,
        preset,

        readMode: wipe ? 'none' : 'metadata',
        writeMode: 'metadata',

        provider: hre.ethers.provider as unknown as ethers.providers.JsonRpcProvider,
        chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId,
        baseDir: hre.config.paths.root,
        savedPackagesDir: hre.config.paths.cannon,
        async getSigner(addr: string) {
          return hre.ethers.getSigner(addr);
        },

        async getDefaultSigner() {
          return (await hre.ethers.getSigners())[0];
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    }

    console.log(greenBright(`Building ${name}:${version}`));
    console.log(green(`Writing package to ${builder.packageDir}`));

    const registry = new CannonRegistry({
      ipfsOptions: hre.config.cannon.ipfsConnection,
      signerOrProvider: hre.config.cannon.registryEndpoint
        ? new JsonRpcProvider(hre.config.cannon.registryEndpoint)
        : hre.ethers.provider,
      address: hre.config.cannon.registryAddress,
    });

    const dependencies = await builder.getDependencies(mappedSettings);

    for (const dependency of dependencies) {
      console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
      await downloadPackagesRecursive(
        dependency.source,
        dependency.chainId,
        dependency.preset,
        registry,
        builder.provider,
        builder.packagesDir
      );
    }

    builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
    builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
    builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));

    const outputs = await builder.build(mappedSettings);

    await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
      outputs,
    });

    if (port) {
      console.log('RPC Server open on port', port);

      // dont exit
      await new Promise(_.noop);
    }
    return {};
    */
  });
