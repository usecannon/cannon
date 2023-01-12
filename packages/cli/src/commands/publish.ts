import { OnChainRegistry } from '@usecannon/builder';
import { blueBright } from 'chalk';
import { ethers } from 'ethers';
import { createDefaultReadRegistry, LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

export async function publish(
  packageRef: string,
  tags: string,
  preset: string,
  signer: ethers.Signer,
  overrides?: ethers.Overrides,
  quiet = false
) {
  console.log(blueBright('publishing signer is', await signer.getAddress()));

  const cliSettings = resolveCliSettings();

  const splitTags = tags.split(',');

  const localRegistry = createDefaultReadRegistry(cliSettings);

  // get a list of all deployments the user is requesting
  const deploys = await (localRegistry.registries[1] as LocalRegistry).scanDeploys(packageRef, `-${preset}`);

  console.log('Found deployment networks:', deploys.map((d) => d.variant).join(', '));

  const registry = new OnChainRegistry({
    signerOrProvider: signer.connect(new ethers.providers.JsonRpcProvider(cliSettings.registryProviderUrl)),
    address: cliSettings.registryAddress,
    overrides,
  });

  const registrationReceipts = [];

  for (const deploy of deploys) {
    const toPublishUrl = await localRegistry.getUrl(deploy.name, deploy.variant);

    const [name, version] = deploy.name.split(':');

    if (toPublishUrl !== (await registry.getUrl(`${name}:${version}`, deploy.variant))) {
      registrationReceipts.push(
        await registry.publish(
          [version, ...splitTags].map((t) => `${name}:${t}`),
          toPublishUrl!,
          deploy.variant
        )
      );
      if (!quiet) {
        console.log(`Published: ${name}:${version} (${deploy.variant})`);
      }
    } else {
      if (!quiet) {
        console.log(`Skipping publish of ${deploy.variant} because it is already published.`);
      }
    }
  }

  console.log(
    JSON.stringify({
      packageRef,
      tags: splitTags,
      registrationReceipts,
    })
  );
}
