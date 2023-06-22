import { IPFSLoader, OnChainRegistry, CannonStorage, copyPackage, publishPackage, publishIpfs } from '@usecannon/builder';
import { blueBright, bold, green } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { readDeploy } from '../package';

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
      `in order to publish, a IPFS URL must be set in your cannon configuration. use '${process.argv[0]} setup' to configure`
    );
  }

  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });

  if (!quiet && signer.getAddress) {
    console.log(blueBright('publishing signer is', await signer.getAddress()));
  }

  if (packageRef.startsWith('@ipfs:')) {
    if (!chainId) throw new Error('chainId must be specified when publishing an IPFS reference');
    if (!preset) throw new Error('preset must be specified when publishing an IPFS reference');

    const deployInfo = await readDeploy(packageRef, chainId, preset);

    // Make sure that the IPFS file is uploaded to the configured publish node
    if (cliSettings.publishIpfsUrl && cliSettings.ipfsUrl) {
      console.log(blueBright('uploading ipfs file to configured publish node', packageRef));
      console.log();

      const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
      const readStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
      const publishStorage = new CannonStorage(onChainRegistry, {
        ipfs: new IPFSLoader(cliSettings.publishIpfsUrl),
      });

      await publishIpfs({ packageRef, chainId, preset, readStorage, publishStorage });
    }

    console.log(blueBright('publishing remote ipfs package to registry', packageRef));
    console.log();

    const res = await publishPackage({
      url: packageRef.replace('@ipfs:', 'ipfs://'),
      deployInfo,
      registry: onChainRegistry,
      tags,
      chainId,
      preset,
    });

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
