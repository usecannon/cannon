import { DeploymentInfo, IPFSLoader, OnChainRegistry, StepState } from '@usecannon/builder';
import { blueBright, yellowBright } from 'chalk';
import Debug from 'debug';
import { ethers } from 'ethers';
import { readMetadataCache } from '../helpers';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

const debug = Debug('cannon:cli:publish');

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

    if (force || toPublishUrl !== (await registry.getUrl(`${name}:${version}`, deploy.variant))) {
      let metaUrl;
      // ensure the deployment is on the remote registry
      if (cliSettings.publishIpfsUrl && cliSettings.publishIpfsUrl !== cliSettings.ipfsUrl) {
        const localLoader = new IPFSLoader(cliSettings.ipfsUrl, localRegistry);
        const remoteLoader = new IPFSLoader(cliSettings.publishIpfsUrl, localRegistry);

        const deployData = await localLoader.readDeploy(deploy.name, preset, parseInt(deploy.variant.split('-')[0]));

        if (!deployData) {
          throw new Error(
            'ipfs could not find deployment artifact. please double check your settings, and rebuild your package.'
          );
        }

        const [url, miscUrl] = await reuploadIpfs(localLoader, remoteLoader, deployData);

        if (url !== toPublishUrl || miscUrl !== deployData!.miscUrl) {
          throw new Error('re-deployed urls do not match up');
        }

        metaUrl = await remoteLoader.putMisc(await readMetadataCache(`${name}:${version}`));

        if (!deployData) {
          throw new Error(`deployment data not found for tagged deployment:, ${deploy.name}, (${deploy.variant})`);
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

async function reuploadIpfs(src: IPFSLoader, dst: IPFSLoader, deployData: DeploymentInfo) {
  // check imports for any urls. If any exist, we need to reupload those also
  for (const stepState of Object.entries(deployData.state || {})) {
    for (const importArtifact of Object.entries((stepState[1] as StepState).artifacts.imports || {})) {
      if (importArtifact[1].url) {
        // we need to upload nested ipfs deploys as well
        const info = await src.readMisc(importArtifact[1].url);
        const [url, miscUrl] = await reuploadIpfs(src, dst, info);
        if (url !== importArtifact[1].url || miscUrl !== info!.miscUrl) {
          throw new Error('re-deployed urls do not match up');
        }
      }
    }
  }

  const miscUrl = await dst.putMisc(await src.readMisc(deployData!.miscUrl));
  debug(`ipfs re-uploaded: ${miscUrl}`);

  const url = await dst.putDeploy(deployData!);
  debug(`ipfs re-uploaded: ${url}`);

  return [url, miscUrl];
}
