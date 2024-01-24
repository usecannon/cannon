import path from 'node:path';
import { CannonJsonRpcProvider, CannonWrapperGenericProvider } from '@usecannon/builder';
import { build, createDryRunRegistry, loadCannonfile, parseSettings, resolveCliSettings } from '@usecannon/cli';
import { getProvider } from '@usecannon/cli/dist/src/rpc';
import { bold, yellow, yellowBright } from 'chalk';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { task } from 'hardhat/config';
import { HttpNetworkConfig } from 'hardhat/types';
import { augmentProvider } from '../internal/augment-provider';
import { getHardhatSigners } from '../internal/get-hardhat-signers';
import { loadPackageJson } from '../internal/load-pkg-json';
import { parseAnvilOptions } from '../internal/parse-anvil-options';
import { SubtaskRunAnvilNodeResult } from '../subtasks/run-anvil-node';
import { SUBTASK_GET_ARTIFACT, SUBTASK_RUN_ANVIL_NODE, TASK_BUILD } from '../task-names';

import type { ethers } from 'ethers';
task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addPositionalParam('cannonfile', 'Path to a cannonfile to build', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
  .addOptionalParam('preset', '(Optional) The preset label for storing the build with the given settings')
  .addOptionalParam('registryPriority', '(Optional) Which registry should be used first? Default: onchain')
  .addOptionalParam(
    'anvilOptions',
    '(Optional) Custom anvil options string or json file or string to configure when running on the cannon network or a local forked node'
  )
  .addFlag('dryRun', 'Run a shadow deployment on a local forked node instead of actually deploying')
  .addFlag('wipe', 'Do not reuse any previously built artifacts')
  .addFlag('usePlugins', 'Load plugins globally installed using the cannon CLI')
  .addOptionalParam(
    'upgradeFrom',
    '(Optional) Wipe the deployment files, and use the deployment files from another cannon package as base'
  )
  .addOptionalParam('impersonate', '(Optional) When dry running, uses forked signers rather than actual signing keys')
  .addOptionalParam(
    'writeScript',
    '(Experimental) Path to write all the actions taken as a script that can be later executed'
  )
  .addOptionalParam(
    'writeScriptFormat',
    '(Experimental) Format in which to write the actions script (Options: json, ethers)'
  )
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .setAction(
    async (
      {
        cannonfile,
        settings,
        upgradeFrom,
        presetArg,
        noCompile,
        wipe,
        usePlugins,
        registryPriority,
        dryRun,
        anvilOptions: anvilOptionsParam,
        impersonate,
        writeScript,
        writeScriptFormat,
      },
      hre
    ) => {
      if (!noCompile) {
        await hre.run(TASK_COMPILE);
        console.log('');
      }

      // If the first param is not a cannonfile, it should be parsed as settings
      if (typeof cannonfile === 'string' && cannonfile !== '-' && !cannonfile.endsWith('.toml')) {
        settings.unshift(cannonfile);
        cannonfile = 'cannonfile.toml';
      }

      const parsedSettings = parseSettings(settings);

      const { name, version, def, preset } = await loadCannonfile(path.join(hre.config.paths.root, cannonfile));

      if (hre.network.name === 'hardhat' && dryRun) {
        throw new Error('You cannot use --dry-run param when using the "hardhat" network');
      }

      let provider =
        hre.network.name === 'hardhat'
          ? // hardhat network is "special" in that it looks like its a jsonrpc provider,
            // but really you can't use it like that.
            new CannonWrapperGenericProvider({}, (hre as any).ethers.provider, false)
          : new CannonJsonRpcProvider({}, (hre.network.config as HttpNetworkConfig).url);

      if (dryRun) {
        console.log(
          yellowBright(
            bold('⚠️ This is a simulation. No changes will be made to the chain. No package data will be saved.\n')
          )
        );
      }

      const anvilOptions = parseAnvilOptions(anvilOptionsParam);
      const node: SubtaskRunAnvilNodeResult = await hre.run(SUBTASK_RUN_ANVIL_NODE, { dryRun, anvilOptions });

      if (node) {
        provider = getProvider(node);
      }

      const signers = await getHardhatSigners(hre, provider);

      const getSigner = async (address: string) => {
        const addr: string = (hre as any).ethers.utils.getAddress(address);
        for (const signer of signers) {
          const signerAddr = await signer.getAddress();
          if (addr === signerAddr) return signer;
        }
      };

      let defaultSigner: ethers.Signer | null = null;
      if (hre.network.name !== 'cannon') {
        if (impersonate) {
          await provider.send('hardhat_impersonateAccount', [impersonate]);
          await provider.send('hardhat_setBalance', [impersonate, `0x${(1e22).toString(16)}`]);
          defaultSigner = (await getSigner(impersonate)) || null;
          // Add the impersonated signer if it is not part of the hardhat config
          if (!defaultSigner) {
            defaultSigner = provider.getSigner(impersonate);
            signers.push(defaultSigner);
          }
        } else {
          defaultSigner = signers[0];
        }
      }

      if (defaultSigner) {
        // print out any live deployment info that might be relevant
        console.log(yellow(`default signer is ${await defaultSigner.getAddress()}`));
      }

      const params = {
        provider,
        def,
        packageDefinition: {
          name,
          version,
          preset,
          settings: parsedSettings,
        },
        getArtifact: async (contractName: string) => await hre.run(SUBTASK_GET_ARTIFACT, { name: contractName }),
        async getSigner(addr: string) {
          if (impersonate || hre.network.name === 'cannon' || hre.network.name === 'hardhat') {
            // on test network any user can be conjured
            await provider.send('hardhat_impersonateAccount', [addr]);
            await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
            return provider.getSigner(addr);
          } else {
            // return the actual signer with private key
            const signer = await getSigner(addr);
            if (signer) return signer;
            throw new Error(
              `the current step requests usage of the signer with address ${addr}, but this signer is not found. Please either supply the private key, or change the cannon configuration to use a different signer.`
            );
          }
        },
        getDefaultSigner: defaultSigner ? async () => defaultSigner! : undefined,
        pkgInfo: loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
        projectDirectory: hre.config.paths.root,
        presetArg,
        upgradeFrom,
        wipe,
        registryPriority,
        persist: !dryRun && hre.network.name !== 'hardhat',
        overrideResolver: dryRun ? await createDryRunRegistry(resolveCliSettings()) : undefined,
        plugins: !!usePlugins,
        publicSourceCode: hre.config.cannon.publicSourceCode,
        writeScript,
        writeScriptFormat,
      } as const;

      const { outputs } = await build(params);

      if (hre.network.name === 'hardhat') {
        console.log(
          yellow(
            'Keep in mind that regardless this package was succefully built, it was not saved because the "hardhat" network is being used. If this is not what you want, consider using --network cannon'
          )
        );
      }

      await augmentProvider(hre, outputs);
      provider.artifacts = outputs;

      hre.cannon.outputs = outputs;

      return { outputs, provider, signers };
    }
  );
