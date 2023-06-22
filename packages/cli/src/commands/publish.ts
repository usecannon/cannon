import { IPFSLoader, OnChainRegistry, CannonStorage, copyPackage, publishPackage } from '@usecannon/builder';
import { blueBright, bold, green } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { readDeploy } from '../package';
import { getChainDataFromId } from '../helpers';

interface Params {
  packageRef: string;
  signer: ethers.Signer;
  tags: string[];
  chainId?: number;
  preset?: string;
  quiet?: boolean;
  recursive?: boolean;
  overrides?: ethers.Overrides;
}

export async function publish({
  packageRef,
  signer,
  tags = ['latest'],
  chainId = 13370,
  preset = 'main',
  quiet = false,
  recursive = true,
  overrides,
}: Params) {
  const cliSettings = resolveCliSettings();

  if (!cliSettings.ipfsUrl && !cliSettings.publishIpfsUrl) {
    throw new Error(
      `In order to publish, a IPFS URL must be set in your Cannon configuration. Use '${process.argv[0]} setup' to configure.`
    );
  }

  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });

  if (!quiet) {
    console.log(blueBright('Publishing signer is', await signer.getAddress()));
  }

  if (packageRef.startsWith('@ipfs:')) {
    if (!chainId) throw new Error('chainId must be specified when publishing an IPFS reference');
    if (!preset) throw new Error('preset must be specified when publishing an IPFS reference');

    const deployInfo = await readDeploy(packageRef, chainId, preset);
    console.log(blueBright('publishing remote ipfs package', packageRef));
    console.log(
      blueBright(
        'Uploading the following Cannon package data to',
        cliSettings.publishIpfsUrl,
        'Tags',
        tags,
        'Variant',
        `${chainId!}-${preset!}`,
        'QM Hash'
      )
    );
    console.log();
    const res = await publishPackage({
      url: packageRef.replace('@ipfs:', 'ipfs://'),
      deployInfo,
      registry: onChainRegistry,
      tags,
      chainId,
      preset,
    });

    console.log(
      'Publishing name:',
      res.name,
      ':version:',
      res.version,
      ':variant:',
      res.variant,
      'to the Cannon registry (',
      cliSettings.registryAddress,
      ') using signer',
      await signer.getAddress(),
      'on',
      getChainDataFromId(chainId),
      '.'
    );

    for (const tag of [res.version, ...res.tags]) {
      console.log(green(bold('published:'), `${res.name}:${tag} (${res.variant})`));
    }

    return;
  }

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  // get a list of all deployments the user is requesting

  let variantFilter = /.*/;
  if (chainId && preset) {
    variantFilter = new RegExp(`^${chainId}-${preset}$`);
  } else if (chainId) {
    variantFilter = new RegExp(`^${chainId}-.*$`);
  } else if (preset) {
    variantFilter = new RegExp(`^.*-${preset}$`);
  }

  const deploys = await localRegistry.scanDeploys(new RegExp(`^${packageRef}$`), variantFilter);

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

    registrationReceipts.push(newReceipts);
  }

  console.log(
    JSON.stringify(
      {
        packageRef,
        tags,
        registrationReceipts,
      },
      null,
      2
    )
  );
}
