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
import { bold, cyanBright, gray, green, yellow } from 'chalk';
import prompts from 'prompts';
import * as viem from 'viem';
import { log } from '../util/console';
import { getMainLoader } from '../loader';
import { LocalRegistry } from '../registry';
import { CliSettings } from '../settings';

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
  tags = ['latest'],
  onChainRegistry,
  chainId,
  quiet = false,
  includeProvisioned = true,
  skipConfirm = false,
}: Params) {
  if (onChainRegistry instanceof OnChainRegistry && !onChainRegistry.signer) {
    throw new Error('signer not provided in registry');
  }

  // Generate CannonStorage to publish ipfs remotely and write to the registry
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || getCannonRepoRegistryUrl()),
  });

  // Generate CannonStorage to retrieve the local instance of the package
  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  let deploys = await localRegistry.scanDeploys(fullPackageRef, chainId);

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find any deployments for ${fullPackageRef} with chain id ${chainId}. If you have the IPFS hash of the deployment data, use the fetch command. Otherwise, rebuild the package.`
    );
  }

  // Select screen for when a user is looking for all the local deploys
  if (!skipConfirm && deploys.length > 1) {
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

    if (!prompt.value) {
      log('You must select a package to publish');
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
      tags: publishTags,
      includeProvisioned,
    });

    publishCalls.push(...calls);
  }

  if (!publishCalls.length) {
    throw new Error("There isn't anything new to publish.");
  }

  if (!quiet) {
    if (onChainRegistry instanceof OnChainRegistry) {
      log('\n' + bold('Publishing Package'));
      log(gray('================================================================================'));
      log(`Package: ${cyanBright(fullPackageRef)}`);
      log(`Signer: ${cyanBright(onChainRegistry.signer!.address)}`);
      log(gray('================================================================================\n'));
    }

    log(bold('Package Details:'));
    for (const publishCall of publishCalls) {
      const packageName = new PackageReference(publishCall.packagesNames[0]).name;
      log(gray('--------------------------------------------------------------------------------'));
      log(`Package: ${cyanBright(packageName)}`);
      
      for (const fullPackageRef of publishCall.packagesNames) {
        const { version, preset } = new PackageReference(fullPackageRef);
        log(`  • ${cyanBright(version)}${preset !== 'main' ? ` (preset: ${preset})` : gray(' (default)')}`);
      }
      
      if (publishCall.url) {
        log(gray('\nIPFS Data:'));
        log(gray(`  URL: ${publishCall.url}`));
      }
    }

    if (onChainRegistry instanceof OnChainRegistry) {
      const totalFees = await onChainRegistry.calculatePublishingFee(publishCalls.length);
      
      log(bold('\nTransaction Details:'));
      log(gray(`  Publishing Fee: ${viem.formatEther(totalFees)} ETH`));
      
      if (totalFees > 0n) {
        const balance = await onChainRegistry.provider!.getBalance({ 
          address: onChainRegistry.signer!.address 
        });
        
        if (totalFees >= balance) {
          throw new Error('You do not appear to have enough ETH in your wallet to publish');
        }
      }
    }
  }

  if (!skipConfirm) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with publishing?',
    });

    if (!proceed) {
      throw new Error('User aborted');
    }
  }

  if (!quiet) {
    log(gray('\nPublishing packages...'));
  }
  
  const txHashes = await onChainRegistry.publishMany(publishCalls);
  
  if (!quiet) {
    log(`\n${green('✓')} Successfully published packages`);
    for (const txHash of txHashes) {
      log(gray(`Transaction Hash: ${txHash}`));
    }
    log('\n');
  }

  return txHashes;
}
