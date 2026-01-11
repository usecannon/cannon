import path from 'node:path';
import { CannonSigner } from '@usecannon/builder';
import { build, createDryRunRegistry, loadCannonfile, parseSettings, resolveCliSettings } from '@usecannon/cli';
import { getChainById } from '@usecannon/cli/dist/src/chains.js';
import { getProvider } from '@usecannon/cli/dist/src/rpc.js';
import chalk from 'chalk';
import * as viem from 'viem';
import { getHardhatSigners } from '../internal/get-hardhat-signers.js';
import { loadPackageJson } from '../internal/load-pkg-json.js';
import { parseAnvilOptions } from '../internal/parse-anvil-options.js';
import { runAnvilNode } from '../internal/run-anvil-node.js';
import { CannonError } from '@usecannon/builder';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import getArtifactData from '../internal/get-artifact-data.js';

interface BuildTaskArguments {
  cannonfile: string;
  settings: string[];
  registryPriority: string;
  anvilOptions: string;
  dryRun: boolean;
  wipe: boolean;
  upgradeFrom: string;
  impersonate: string;
  writeScript: string;
  writeScriptFormat: string;
  noCompile: boolean;
}

export default async function (
  taskArguments: BuildTaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  let { cannonfile } = taskArguments;
  const {
    settings,
    registryPriority,
    anvilOptions: anvilOptionsParam,
    dryRun,
    wipe,
    upgradeFrom,
    impersonate,
    writeScript,
    writeScriptFormat,
    noCompile,
  } = taskArguments;

  const usePlugins = false;

  if (!noCompile) {
    await hre.tasks.getTask('compile').run();
    console.log('');
  }

  // If the first param is not a cannonfile, it should be parsed as settings
  if (typeof cannonfile === 'string' && cannonfile !== '-' && !cannonfile.endsWith('.toml')) {
    settings.unshift(cannonfile);
    cannonfile = 'cannonfile.toml';
  }

  const parsedSettings = parseSettings(settings);

  const { name, version, def, preset } = await loadCannonfile(path.join(hre.config.paths.root, cannonfile));

  if (def.danglingDependencies.size) {
    const neededDeps = Array.from(def.danglingDependencies).map((v) => v.split(':'));
    throw new CannonError(
      `Unknown template access found. Please ensure the following references are defined:\n${neededDeps
        .map(([input, node]) => `${chalk.bold(input)} in ${chalk.italic(node)}`)
        .join('\n')}`,
    );
  }

  if (hre.globalOptions.network === 'hardhat' && dryRun) {
    throw new Error('You cannot use --dry-run param when using the "hardhat" network');
  }

  const providerOptions = {
    mode: 'hardhat',
    chain: getChainById(31337),
    transport: viem.custom((await hre.network.connect()).provider),
  };

  let provider: viem.PublicClient & viem.TestClient & viem.WalletClient = viem
    .createTestClient(providerOptions as any)
    .extend(viem.walletActions)
    .extend(viem.publicActions as any);

  if (dryRun) {
    console.log(
      chalk.yellowBright(
        chalk.bold('⚠️ This is a simulation. No changes will be made to the chain. No package data will be saved.\n'),
      ),
    );
  }

  const anvilOptions = parseAnvilOptions(anvilOptionsParam);
  const node = await runAnvilNode({ dryRun, anvilOptions }, hre);

  if (node) {
    provider = getProvider(node)!;
  }

  const signers = await getHardhatSigners(hre);

  const getSigner = (address: viem.Address): CannonSigner | null => {
    for (const signer of signers) {
      if (viem.isAddressEqual(signer.address, address))
        return {
          address: signer.address,
          wallet: viem.createWalletClient({
            account: signer,
            chain: provider.chain,
            transport: viem.custom(provider.transport),
          }),
        };
    }

    return null;
  };

  let defaultSigner: CannonSigner | null = null;
  if (hre.globalOptions.network !== 'cannon') {
    if (impersonate) {
      const impersonatedAddress = viem.getAddress(impersonate);
      await provider.impersonateAccount({ address: impersonatedAddress });
      await provider.setBalance({ address: impersonatedAddress, value: viem.parseEther('10000') });
      defaultSigner = getSigner(impersonatedAddress) || null;
      // Add the impersonated signer if it is not part of the hardhat config
      if (!defaultSigner) {
        defaultSigner = { address: impersonatedAddress, wallet: provider };
        signers.push({ address: impersonatedAddress } as any);
      }
    } else {
      defaultSigner = getSigner(signers[0].address);
    }
  }

  if (defaultSigner) {
    // print out any live deployment info that might be relevant
    console.log(chalk.yellow(`default signer is ${defaultSigner.address}`));
  }

  const params: Parameters<typeof build>[0] = {
    provider,
    def,
    packageDefinition: {
      name,
      version,
      preset,
      settings: parsedSettings,
    },
    getArtifact: async (contractName: string) => await getArtifactData({ name: contractName }, hre),
    async getSigner(addr: viem.Address) {
      if (impersonate || hre.globalOptions.network === 'cannon' || hre.globalOptions.network === 'hardhat') {
        // on test network any user can be conjured
        await provider.impersonateAccount({ address: addr });
        await provider.setBalance({ address: addr, value: viem.parseEther('10000') });
        return { address: addr, wallet: provider };
      } else {
        // return the actual signer with private key
        const signer = getSigner(addr);
        if (signer) return signer;
        throw new Error(
          `The current operation requests usage of the signer with address ${addr}, but this signer is not found. Please either supply the private key, or change the cannon configuration to use a different signer.`,
        );
      }
    },
    getDefaultSigner: defaultSigner ? async () => defaultSigner! : undefined,
    pkgInfo: loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
    projectDirectory: hre.config.paths.root,
    upgradeFrom,
    wipe,
    registryPriority: registryPriority as any,
    dryRun: dryRun || hre.globalOptions.network === 'hardhat',
    overrideResolver: dryRun ? await createDryRunRegistry(resolveCliSettings()) : undefined,
    plugins: !!usePlugins,
    privateSourceCode: false,
    writeScript,
    writeScriptFormat: writeScriptFormat as any,
  } as const;

  const { outputs } = await build(params);

  if (hre.globalOptions.network === 'hardhat') {
    console.log(
      chalk.yellow(
        'Keep in mind that regardless this package was succefully built, it was not saved because the "hardhat" network is being used. If this is not what you want, consider using --network cannon',
      ),
    );
  }

  return { outputs };
}