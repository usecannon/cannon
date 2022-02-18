import 'hardhat/types/config';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    cannon?: {
      registryAddress?: string;
    };
  }

  export interface HardhatConfig {
    cannon: {
      registryAddress: string;
    };
  }
}
