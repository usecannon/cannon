import type { HardhatNetworkConfig } from 'hardhat/types/config';
import type { BuildOutputs } from './types';
import type { getContract, getContractData, getAllContractDatas } from './utils';
import type * as viem from 'viem';

declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    cannon?: Record<string, never>;
  }

  export interface NetworksConfig {
    cannon: CannonNetworkConfig;
  }

  //export type NetworkConfig = NetworkConfig | HttpNetworkConfig;

  // TODO: this is a known (and apparently decided to be unsolved) issue with ts https://github.com/microsoft/TypeScript/issues/28078
  // therefore, in the future it would be best to update hardhat upstream to use the reccomended workaround and
  // remove the hardhatntework extension
  export interface CannonNetworkConfig extends HardhatNetworkConfig {
    // nothing for now
    port: number;
    url: string;
  }

  export interface HardhatConfig {
    cannon: Record<string, never>;
  }
}

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    cannon: {
      /** Output generated on last build */
      outputs?: BuildOutputs;
      provider?: viem.PublicClient & viem.TestClient & viem.WalletClient;
      signers?: viem.Account[];
      /** Get the abi and address from a specific contract */
      getContract: typeof getContract;
      /** Get all the contract data from a specific contract */
      getContractData: typeof getContractData;
      /** Get all the contracts generated during the executed cannon:build */
      getAllContractDatas: typeof getAllContractDatas;
    };
  }
}
