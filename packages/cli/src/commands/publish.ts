import { IPFSLoader, OnChainRegistry } from '@usecannon/builder';
import { blueBright, yellowBright } from 'chalk';
import { ethers } from 'ethers';
import { readMetadataCache } from '../helpers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

export async function publish(
  packageRef: string,
  tags: string,
  preset: string,
  signer: ethers.Signer,
  overrides?: ethers.Overrides,
  quiet = false,
  force = false
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

  const registry = new OnChainRegistry({
    signerOrProvider: signer.connect(new ethers.providers.JsonRpcProvider(cliSettings.registryProviderUrl)),
    address: cliSettings.registryAddress,
    overrides,
  });

  const registrationReceipts = [];

  for (const deploy of deploys) {
    const toPublishUrl = await localRegistry.getUrl(deploy.name, deploy.variant);

    const [name, version] = deploy.name.split(':');

    if (!force && toPublishUrl !== (await registry.getUrl(`${name}:${version}`, deploy.variant))) {
      let metaUrl;
      // ensure the deployment is on the remote registry
      if (cliSettings.publishIpfsUrl && cliSettings.publishIpfsUrl !== cliSettings.ipfsUrl) {
        if (!quiet) {
          console.log('re-uploading to publish ipfs');
        }
        const localLoader = new IPFSLoader(cliSettings.ipfsUrl, localRegistry);
        const remoteLoader = new IPFSLoader(cliSettings.publishIpfsUrl, localRegistry);

        const deployData = await localLoader.readDeploy(deploy.name, preset, parseInt(deploy.variant.split('-')[0]));

        if (!deployData) {
          throw new Error(`deployment data not found for tagged deployment:, ${deploy.name}, (${deploy.variant})`);
        }

        const miscUrl = await remoteLoader.putMisc(await localLoader.readMisc(deployData!.miscUrl));
        metaUrl = await remoteLoader.putMisc(await readMetadataCache(`${name}:${version}`));
        const url = await remoteLoader.putDeploy(deployData!);

        if (url !== toPublishUrl || miscUrl !== deployData!.miscUrl) {
          throw new Error('re-deployed urls do not match up');
        }
      } else {
        console.log(
          yellowBright(
            'Your package has not been pushed to a remote IPFS endpoint. Run `npx @usecannon/cli setup` to update your settings and run this command again to make sure the package is available remotely.'
          )
        );
      }

      registrationReceipts.push(
        await registry.publish(
          [version, ...splitTags].map((t) => `${name}:${t}`),
          deploy.variant,
          toPublishUrl!,
          metaUrl || undefined
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
