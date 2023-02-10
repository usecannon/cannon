import { CannonRegistry, IPFSLoader as CannonIPFSLoader } from '@usecannon/builder';

export class IPFSLoader extends CannonIPFSLoader {
  constructor(ipfsUrl: string, resolver: CannonRegistry) {
    super(ipfsUrl, resolver, {
      'User-Agent': 'cannon-cli-2'
    })
  }
}
