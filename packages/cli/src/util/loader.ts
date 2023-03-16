import { CannonRegistry, IPFSLoader } from '@usecannon/builder';

export function getIpfsLoader(ipfsUrl: string, resolver: CannonRegistry) {
  return new IPFSLoader(ipfsUrl, resolver);
}
