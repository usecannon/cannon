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
import { blueBright, bold, gray, yellow } from 'chalk';
import prompts from 'prompts';
import * as viem from 'viem';
import { getMainLoader } from '../loader';
import { LocalRegistry } from '../registry';
import { CliSettings } from '../settings';

interface Params {
  packageRef: string;
  cliSettings: CliSettings;
  tags?: string[];
  onChainRegistry: CannonRegistry;
  chainId?: number;
  presetArg?: string;
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
  packageRef,
  cliSettings,
  onChainRegistry,
  tags = ['latest'],
  chainId,
  presetArg,
  quiet = false,
  includeProvisioned = true,
  skipConfirm = false,
}: Params) {
  const { fullPackageRef } = new PackageReference(packageRef);

  // Handle deprecated preset specification
  if (presetArg && !packageRef.startsWith('@')) {
    console.warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );

    packageRef = packageRef.split('@')[0] + `@${presetArg}`;
  }

  if (onChainRegistry instanceof OnChainRegistry) {
    if (!onChainRegistry.signer) {
      throw new Error('signer not provided in registry');
    }
    if (!quiet) {
      console.log(blueBright(`Publishing with ${onChainRegistry.signer!.address}`));
      console.log();
    }
  }
  // Generate CannonStorage to publish ipfs remotely and write to the registry
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || getCannonRepoRegistryUrl()),
  });

  // Generate CannonStorage to retrieve the local instance of the package
  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  // if the package reference doesnt contain a version reference we still want to scan deploys without it.
  // This works as a catch all to get any deployment stored locally.
  // However if a version is passed, we use the basePackageRef to extrapolate and remove any potential preset in the reference.
  let deploys;
  if (packageRef.startsWith('@')) {
    deploys = [{ name: packageRef, chainId: 13370 }];
  } else {
    // Check for deployments that are relevant to the provided packageRef
    deploys = await localRegistry.scanDeploys(packageRef, chainId);
  }

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
        const { fullPackageRef } = new PackageReference(d.name);

        return {
          title: `${fullPackageRef} (Chain ID: ${d.chainId})`,
          description: '',
          value: d,
        };
      }),
    });

    if (!prompt.value) {
      console.log('You must select a package to publish');
      process.exit(1);
    }

    tags = tags.filter((t) => t !== new PackageReference(prompt.value.name).version);

    deploys = [prompt.value] as typeof deploys;
  }

  // Doing some filtering on deploys list so that we can iterate over every "duplicate" package which has more than one version being deployed.
  const deployNames = deploys.map((deploy) => {
    const { name, version, preset } = new PackageReference(deploy.name);
    return { name, version, preset, chainId: deploy.chainId };
  });

  // "dedupe" the deploys so that when we iterate we can go over every package deployment by version
  const parentPackages: DeployList[] = deployNames.reduce((result: DeployList[], item) => {
    const matchingDeploys = result.find((i) => !i.name.startsWith('@') && i.name === item.name && i.preset === item.preset);

    if (matchingDeploys) {
      matchingDeploys.versions.push(item.version);
    } else {
      const versions = item.name.startsWith('@') ? [] : [item.version];
      result.push({ name: item.name, versions, chainId: item.chainId, preset: item.preset });
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

  if (!skipConfirm) {
    for (const publishCall of publishCalls) {
      const packageName = new PackageReference(publishCall.packagesNames[0]).name;
      console.log(blueBright(`\nThis will publish ${bold(packageName)} to the registry:`));
      for (const fullPackageRef of publishCall.packagesNames) {
        const { version, preset } = new PackageReference(fullPackageRef);
        console.log(` - ${version} (preset: ${preset})`);
      }
    }

    console.log('\n');

    if (onChainRegistry instanceof OnChainRegistry) {
      const totalFees = await onChainRegistry.calculatePublishingFee(publishCalls.length);

      console.log(`Total publishing fees: ${viem.formatEther(totalFees)} ETH`);
      console.log();

      if (
        totalFees > 0n &&
        totalFees >= (await onChainRegistry.provider!.getBalance({ address: onChainRegistry.signer!.address }))
      ) {
        throw new Error('you do not appear to have enough ETH in your wallet to publish');
      }
    }

    const verification = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Proceed?',
      initial: true,
    });

    if (!verification.confirmation) {
      console.log('Cancelled');
      process.exit(1);
    }
  }

  console.log(bold('Publishing package...'));
  console.log(gray('This may take a few minutes.'));
  console.log();

  const registrationReceipts = await toStorage.registry.publishMany(publishCalls);

  if (!quiet) {
    console.log(blueBright('Transactions:'));
    for (const tx of registrationReceipts) console.log(`  - ${tx}`);
  }
}
