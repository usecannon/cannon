import { ethers } from 'ethers';
import { CannonRegistry } from '@usecannon/builder';

interface Options {
  registryAddress: string;
  registryRpc: string;
  ipfsUrl: string;
  ipfsAuthorizationHeader?: string;
}

export default function createRegistry({ registryAddress, registryRpc, ipfsUrl, ipfsAuthorizationHeader }: Options) {
  const ipfsOptions: ConstructorParameters<typeof CannonRegistry>[0]['ipfsOptions'] = { url: ipfsUrl };

  if (ipfsAuthorizationHeader) {
    ipfsOptions.headers = {
      authorization: ipfsAuthorizationHeader,
    };
  }

  return new CannonRegistry({
    address: registryAddress,
    signerOrProvider: new ethers.providers.JsonRpcProvider(registryRpc),
    ipfsOptions,
  });
}
