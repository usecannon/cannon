import 'hardhat/types/config';

import { Options as IPFSConnectionOptions } from 'ipfs-http-client';

declare module 'hardhat/types/config' {
  export interface ProjectPathsUserConfig {
    deployments?: string;
  }
  export interface HardhatUserConfig {
    cannon?: {
      registryEndpoint?: string;
      registryAddress?: string;
      publisherPrivateKey?: string;
      ipfsConnection?: IPFSConnectionOptions;
    };
  }

  export interface ProjectPathsConfig {
    deployments: string;
  }

  export interface HardhatConfig {
    cannon: {
      registryEndpoint: string;
      registryAddress: string;
      publisherPrivateKey?: string;
      ipfsConnection: IPFSConnectionOptions;
    };
  }
}
