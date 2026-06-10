import {
  CannonRegistry,
  CannonStorage,
  getCannonRepoRegistryUrl,
  IPFSLoader,
  OnChainRegistry,
  PackagePublishCall,
  PackageReference,
  preparePublishPackage,
} from '@usecannon/builder';
import chalk from 'chalk';
import prompts from 'prompts';
import * as viem from 'viem';
import { logSpinner, logSpinnerStart, logSpinnerEnd } from '../util/console.js';
import { getMainLoader } from '../loader.js';
import { LocalRegistry } from '../registry.js';
import { CliSettings } from '../settings.js';

interface Params {
  fullPackageRef: string;
  cliSettings: CliSettings;
  tags?: string[];
  onChainRegistry: CannonRegistry;
  chainId?: number;
  quiet?: boolean;
  includeProvisioned?: boolean;
  skipConfirm?: boolean;
}

interface DeployList {
  name: string;
  versions: string[];
  preset: string;
  chainId: number;
}

export async function publish({
  fullPackageRef,
  cliSettings,
  onChainRegistry,
  tags = ['latest'],
  chainId,
  quiet = false,
  includeProvisioned = true,
  skipConfirm = false,
}: Params) {
  if (onChainRegistry instanceof OnChainRegistry) {
    if (!onChainRegistry.signer) {
      throw new Error('signer not provided in registry');
    }
    if (!quiet) {
      logSpinner(chalk.blueBright(`Publishing with ${onChainRegistry.signer!.address}`));
      logSpinner();
    }
  }
  // Generate CannonStorage to publish ipfs remotely and write to the registry
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || getCannonRepoRegistryUrl()),
  });

  // Generate CannonStorage to retrieve the local instance of the package
  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  // if the package reference is an ipfs reference (url or hash) we pass it the full package ref since its referencing a specific deploy
  let deploys = await localRegistry.scanDeploys(fullPackageRef, chainId);

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${fullPackageRef} with chain id ${chainId}. If you have the IPFS hash of the deployment data, use the fetch command. Otherwise, rebuild the package.`,
    );
  }

  // Select screen for when a user is looking for all the local deploys
  if (!skipConfirm && deploys.length > 1) {
    logSpinnerEnd();
    const prompt = await prompts({
      type: 'select',
      message: 'Select the package you want to publish:\n',
      name: 'value',
      choices: deploys.map((d) => {
        const { fullPackageRef } = new PackageReference(d.name!);

        return {
          title: `${fullPackageRef} (Chain ID: ${d.chainId})`,
          description: '',
          value: d,
        };
      }),
    });
    logSpinnerStart();

    if (!prompt.value) {
      logSpinner('You must select a package to publish');
      process.exit(1);
    }

    tags = tags.filter((t) => t !== new PackageReference(prompt.value.name).version);

    deploys = [prompt.value] as typeof deploys;
  }

  // Doing some filtering on deploys list so that we can iterate over every "duplicate" package which has more than one version being deployed.
  const deployNames = deploys.map((deploy) => {
    const { name, version, preset } = new PackageReference(deploy.name!);
    return { name, version, preset, chainId: deploy.chainId };
  });

  // "dedupe" the deploys so that when we iterate we can go over every package deployment by version
  const parentPackages: DeployList[] = deployNames.reduce((result: DeployList[], item) => {
    const matchingDeploys = result.find((i) => i.name === item.name && i.preset === item.preset);

    if (matchingDeploys) {
      matchingDeploys.versions.push(item.version);
    } else {
      result.push({ name: item.name, versions: [item.version], chainId: item.chainId, preset: item.preset });
    }

    return result;
  }, []);

  const publishCalls: PackagePublishCall[] = [];

  for (const pkg of parentPackages) {
    const publishTags: string[] = pkg.versions.concat(tags);

    const calls = await preparePublishPackage({
      packageRef: PackageReference.from(pkg.name, pkg.versions[0], pkg.preset).fullPackageRef,
      chainId: deploys[0].chainId,
      fromStorage,
      toStorage,
      tags: publishTags!,
      includeProvisioned,
    });

    publishCalls.push(...calls);
  }

  if (!publishCalls.length) {
    throw new Error("There isn't anything new to publish.");
  }

  for (const publishCall of publishCalls) {
    const packageName = new PackageReference(publishCall.packagesNames[0]).name;
    logSpinner(chalk.blueBright(`\nThis will publish ${chalk.bold(packageName)} to the registry:`));

    for (const fullPackageRef of publishCall.packagesNames) {
      const { version, preset } = new PackageReference(fullPackageRef);
      logSpinner(` - ${version} (preset: ${preset})`);
    }
  }

  logSpinner();

  if (onChainRegistry instanceof OnChainRegistry) {
    const totalFees = await onChainRegistry.calculatePublishingFee(publishCalls.length);

    logSpinner(`Total publishing fees: ${viem.formatEther(totalFees)} ETH`);
    logSpinner();

    const balance = await onChainRegistry.provider!.getBalance({ address: onChainRegistry.signer!.address });

    if (totalFees > 0n && totalFees >= balance) {
      throw new Error(
        `You do not appear to have enough ETH in your wallet to publish (balance: ${viem.formatEther(balance)} ETH)`,
      );
    }
  }

  if (!skipConfirm) {
    logSpinnerEnd();
    const verification = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Proceed?',
      initial: true,
    });
    logSpinnerStart();

    if (!verification.confirmation) {
      logSpinner('Cancelled');
      process.exit(1);
    }
  }

  logSpinner(chalk.bold('Publishing package...'));
  logSpinner(chalk.gray('This may take a few minutes.'));
  logSpinner();

  const registrationReceipts = await toStorage.registry.publishMany(publishCalls);

  if (!quiet) {
    logSpinner(chalk.blueBright('Transactions:'));
    for (const tx of registrationReceipts) logSpinner(`  - ${tx}`);
  }
}
