import 'hardhat/types/config';

declare module 'hardhat/types/config' {
  export interface ProjectPathsUserConfig {
    deployments?: string;
    cannon?: string;
  }

  export interface HardhatUserConfig {
    cannon?: {
      registryEndpoint?: string;
      registryAddress?: string;
      ipfsEndpoint?: string;
      ipfsAuthorizationHeader?: string;
    };
  }

  export interface ProjectPathsConfig {
    deployments: string;
    cannon: string;
  }

  export interface HardhatConfig {
    cannon: {
      registryEndpoint: string;
      registryAddress: string;
      ipfsEndpoint: string;
      ipfsAuthorizationHeader?: string;
    };
  }
}
