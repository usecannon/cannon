import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { CannonRegistry } from '@usecannon/builder';

interface Options {
  registryAddress: string;
  ipfsUrl: string;
  registryRpc: string;
}

export default function createRegistry({ registryAddress, ipfsUrl, registryRpc }: Options) {
  const parsedIpfs = new URL(ipfsUrl);

  return new ReadOnlyCannonRegistry({
    address: registryAddress,
    signerOrProvider: new ethers.providers.JsonRpcProvider(registryRpc),
    ipfsOptions: {
      protocol: parsedIpfs.protocol.slice(0, parsedIpfs.protocol.length - 1),
      host: parsedIpfs.host,
      port: parsedIpfs.port ? parseInt(parsedIpfs.port) : parsedIpfs.protocol === 'https:' ? 443 : 80,
    },
  });
}

class ReadOnlyCannonRegistry extends CannonRegistry {
  readonly ipfsOptions: ConstructorParameters<typeof CannonRegistry>[0]['ipfsOptions'];

  constructor(opts: ConstructorParameters<typeof CannonRegistry>[0]) {
    super(opts);

    this.ipfsOptions = opts.ipfsOptions;
  }

  async readIpfs(urlOrHash: string): Promise<Buffer> {
    const hash = urlOrHash.replace(/^ipfs:\/\//, '');

    const result = await fetch(
      `${this.ipfsOptions.protocol}://${this.ipfsOptions.host}:${this.ipfsOptions.port}/ipfs/${hash}`
    );

    return await result.buffer();
  }
}
