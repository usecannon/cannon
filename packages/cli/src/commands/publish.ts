import { OnChainRegistry } from '@usecannon/builder';
import { ethers } from 'ethers';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { parsePackageRef } from '../util/params';

export interface RegistrationOptions {
  signer: ethers.Signer;
  registryAddress: string;
  overrides?: ethers.Overrides;
}

export async function publish(
  packageRef: string,
  tags: string,
  variants: string,
  registrationOptions: RegistrationOptions,
  quiet = false
) {
  const cliSettings = resolveCliSettings();
  const { name, version } = parsePackageRef(packageRef);

  const localRegistry = createDefaultReadRegistry(cliSettings);

  const toPublishUrl = await localRegistry.getUrl(name, version);

  if (!toPublishUrl) {
    throw new Error(`no locally linked package: '${name}:${version}'`);
  }

  const registry = new OnChainRegistry({
    signerOrProvider: registrationOptions.signer,
    address: registrationOptions.registryAddress,
  });

  const registrationReceipts = [];

  for (const tag of [version, ...tags.split(',')]) {
    for (const variant of variants.split(',')) {
      if (toPublishUrl !== (await registry.getUrl(`${name}:${version}`, variant))) {
        registrationReceipts.push(await registry.publish([`${name}:${tag}`], toPublishUrl, 'main'));
        if (!quiet) {
          console.log(`Published: ${name}:${tag}`);
        }
      }
    }
  }

  console.log(
    JSON.stringify({
      name: name,
      version: version,
      tags: tags.split(','),
      ipfsHash: toPublishUrl,
      registrationReceipts,
    })
  );
}
