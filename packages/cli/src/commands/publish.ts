import { IPFSLoader, OnChainRegistry, CannonStorage, publishPackage } from '@usecannon/builder';
import { blueBright } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { PackageReference, getProvisionedPackages } from '@usecannon/builder/dist/package';

import { bold, yellow } from 'chalk';
import prompts from 'prompts';

interface Params {
  packageRef: string;
  signer: ethers.Signer;
  tags: string[];
  chainId?: number;
  presetArg?: string;
  quiet?: boolean;
  overrides?: ethers.CallOverrides;
  publishProvisioned?: boolean;
}

export async function publish({
  packageRef,
  signer,
  tags = ['latest'],
  chainId,
  presetArg,
  quiet = false,
  overrides,
  publishProvisioned = false,
}: Params) {
  const cliSettings = resolveCliSettings();

  if (!cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a publishIpfsUrl setting must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  const { preset, basePackageRef } = new PackageReference(packageRef);

  if (presetArg && preset) {
    console.warn(
      yellow(
        bold(`Duplicate preset definitions in package reference "${packageRef}" and in --preset argument: "${presetArg}"`)
      )
    );
    console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
  }

  const selectedPreset = preset || presetArg || 'main';

  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });

  if (!quiet) {
    console.log(blueBright('Publishing signer is', await signer.getAddress()));
    console.log('');
  }

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  // get a list of all deployments the user is requesting

  let variantFilter = /.*/;
  if (chainId && (preset || presetArg)) {
    variantFilter = new RegExp(`^${chainId}-${preset || presetArg}$`);
  } else if (chainId) {
    variantFilter = new RegExp(`^${chainId}-.*$`);
  } else if (selectedPreset) {
    variantFilter = new RegExp(`^.*-${selectedPreset}$`);
  }

  const deploys = await localRegistry.scanDeploys(basePackageRef, variantFilter);

  if (!deploys || deploys.length === 0) {
    throw new Error(
      `Could not find deployment for ${basePackageRef}, if you have the IPFS hash of the deployment data, run 'fetch ${basePackageRef} <ipfsHash>'. Otherwise rebuild the package and then re-publish`
    );
  }

  if (!quiet) {
    console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '), '\n');
  }

  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl!),
  });

  const registrationReceipts = [];

  for (const deploy of deploys) {
    if (!quiet) {
      if (publishProvisioned) {
        const packages = await getProvisionedPackages(deploy.name, deploy.variant, tags, fromStorage);

        packages.forEach((pkg) => {
          const pkgRef = new PackageReference(pkg.packagesNames[0]);
          console.log(blueBright(`This will publish ${bold(pkgRef.name)} to the registry:`));
          console.log(`${pkgRef.version} (preset: ${selectedPreset})`);
          for (const tag in tags) {
            console.log(`${tags[tag]} (preset: ${selectedPreset})`);
          }
          console.log('\n');
        });
      } else {
        const pkgRef = new PackageReference(deploy.name);
        console.log(blueBright(`This will publish ${bold(pkgRef.name)} to the registry:`));
        console.log(`${pkgRef.version} (preset: ${selectedPreset})`);
        for (const tag in tags) {
          console.log(`${tags[tag]} (preset: ${selectedPreset})`);
        }
        console.log('\n');
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

      console.log('\n------\n');
    }

    const newReceipts = await publishPackage({
      packageRef: deploy.name,
      variant: deploy.variant,
      fromStorage,
      toStorage,
      tags,
      publishProvisioned,
    });

    registrationReceipts.push(...newReceipts);

    console.log(bold(blueBright('Packages published:')));
    if (publishProvisioned) {
      const packages = await getProvisionedPackages(deploy.name, deploy.variant, tags, fromStorage);
      packages.forEach((pkg) => {
        const pkgRef = new PackageReference(pkg.packagesNames[0]);
        console.log(`  - ${pkgRef.basePackageRef}`);
        for (const tag in tags) {
          console.log(`  - ${pkgRef.name}:${tags[tag]}`);
        }
      });
    } else {
      const pkgRef = new PackageReference(deploy.name);
      console.log(`  - ${pkgRef.basePackageRef}`);
      for (const tag in tags) {
        console.log(`  - ${pkgRef.name}:${tags[tag]}`);
      }
    }
  }

  const txs = registrationReceipts.filter((tx) => !!tx);
  if (txs.length) {
    console.log(blueBright('Transactions:'));
    for (const tx of txs) console.log(`  - ${tx}`);
  }
}
