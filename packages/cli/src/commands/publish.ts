import { IPFSLoader, OnChainRegistry, copyPackage } from '@usecannon/builder';
import { blueBright } from 'chalk';
import { ethers } from 'ethers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

export async function publish(
  packageRef: string,
  tags: string,
  preset: string,
  signer: ethers.Signer,
  overrides?: ethers.Overrides,
  quiet = false,
  recursive = true
) {
  const cliSettings = resolveCliSettings();

  const splitTags = tags.split(',');

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  // get a list of all deployments the user is requesting
  const deploys = await localRegistry.scanDeploys(packageRef, `-${preset}`);

  if (!quiet) {
    console.log(blueBright('publishing signer is', await signer.getAddress()));
    console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '));
  }

  const onChainRegistry = new OnChainRegistry({
    signerOrProvider: signer,
    address: cliSettings.registryAddress,
    overrides,
  });

  const fromLoader = new IPFSLoader(cliSettings.ipfsUrl, localRegistry);
  const toLoader = new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl, onChainRegistry);

  const registrationReceipts = [];

  for (const deploy of deploys) {
    const newReceipts = await copyPackage({
      packageRef: deploy.name,
      variant: deploy.variant,
      fromLoader,
      toLoader,
      recursive,
      tags: tags.split(','),
    });

    registrationReceipts.push(newReceipts);
  }

  console.log(
    JSON.stringify({
      packageRef,
      tags: splitTags,
      registrationReceipts,
    })
  );
}
