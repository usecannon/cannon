import { IPFSLoader, OnChainRegistry, CannonStorage, copyPackage } from '@usecannon/builder';
import { blueBright } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { PackageReference } from '@usecannon/builder/dist/package';

import { bold, yellow } from 'chalk';

interface Params {
  packageRef: string;
  signer: ethers.Signer;
  tags: string[];
  chainId?: number;
  presetArg?: string;
  quiet?: boolean;
  recursive?: boolean;
  overrides?: ethers.Overrides;
}

export async function publish({
  packageRef,
  signer,
  tags = ['latest'],
  chainId,
  presetArg,
  quiet = false,
  recursive = true,
  overrides,
}: Params) {
  const cliSettings = resolveCliSettings();

  if (!cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a publishIpfsUrl setting must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  const { name, version, preset } = new PackageReference(packageRef);

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
  }

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  if (packageRef.startsWith('@ipfs:')) {
    if (!chainId) throw new Error('chainId must be specified when publishing an IPFS reference');

    console.log(blueBright('publishing remote ipfs package', packageRef));
    console.log(
      blueBright(
        'Uploading the following Cannon package data to',
        cliSettings.publishIpfsUrl,
        'Tags',
        tags,
        'Variant',
        `${chainId!}-${selectedPreset!}`
      )
    );

    const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
    const toStorage = new CannonStorage(localRegistry, {
      ipfs: new IPFSLoader(cliSettings.publishIpfsUrl),
    });

    await copyPackage({
      packageRef,
      variant: `${chainId}-${selectedPreset}`,
      fromStorage,
      toStorage,
      recursive,
      tags,
    });
  }

  // get a list of all deployments the user is requesting

  let variantFilter = /.*/;
  if (chainId && (preset || presetArg)) {
    variantFilter = new RegExp(`^${chainId}-${preset || presetArg}$`);
  } else if (chainId) {
    variantFilter = new RegExp(`^${chainId}-.*$`);
  } else if (selectedPreset) {
    variantFilter = new RegExp(`^.*-${selectedPreset}$`);
  }

  const deploys = await localRegistry.scanDeploys(`${name}:${version}`, variantFilter);

  if (!quiet) {
    console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '));
  }

  const fromStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  const toStorage = new CannonStorage(onChainRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl!),
  });

  const registrationReceipts = [];

  for (const deploy of deploys) {
    const newReceipts = await copyPackage({
      packageRef: deploy.name,
      variant: deploy.variant,
      fromStorage,
      toStorage,
      recursive,
      tags,
    });

    registrationReceipts.push(...newReceipts);
  }

  if (tags.length) {
    console.log(blueBright('Package published:'));
    for (const tag of tags) {
      console.log(`  - ${packageRef} (${tag})`);
    }
  }

  const txs = registrationReceipts.filter((tx) => !!tx);
  if (txs.length) {
    console.log('\n', blueBright('Transactions:'));
    for (const tx of txs) console.log(`  - ${tx}`);
  }
}
