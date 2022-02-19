import 'hardhat/types/config';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    cannon?: {
      registryEndpoint?: string;
      registryAddress?: string;
      registryPrivateKey?: string;
    };
  }

  export interface HardhatConfig {
    cannon: {
      registryEndpoint: string;
      registryAddress: string;
      registryPrivateKey?: string;
    };
  }
}
