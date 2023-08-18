import { EIP1193Provider, EthereumProvider, HardhatRuntimeEnvironment, RequestArguments } from 'hardhat/types';

//import { HttpProvider } from 'hardhat/internal/core/providers/http';
import { ProviderWrapper } from 'hardhat/internal/core/providers/wrapper';

import { BackwardsCompatibilityProviderAdapter } from 'hardhat/internal/core/providers/backwards-compatibility';
import { ChainArtifacts, handleTxnError } from '@usecannon/builder';
import { ethers } from 'ethers';

import { createProvider } from 'hardhat/internal/core/providers/construction';

import { createProviderProxy } from '@nomiclabs/hardhat-ethers/internal/provider-proxy';

class CannonWrapperProvider extends ProviderWrapper {
  artifacts: ChainArtifacts;

  constructor(provider: EthereumProvider, artifacts: ChainArtifacts) {
    super(provider);
    this.artifacts = artifacts;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    try {
      return this._wrappedProvider.request(args);
    } catch (err) {
      const provider = new ethers.providers.Web3Provider(this._wrappedProvider);
      await handleTxnError(this.artifacts, provider, err);
    }
  }
}

export async function augmentProvider(hre: HardhatRuntimeEnvironment, artifacts: ChainArtifacts = {}) {
  if (hre.network.name === 'cannon') {
    
    hre.config.networks.cannon.url =  `http://127.0.0.1:${hre.config.networks.cannon.port}`

    const baseProvider = await createProvider(
      hre.config,
      hre.network.name,
      hre.artifacts
    );

    const cannonProvider = new CannonWrapperProvider(baseProvider, artifacts);

    hre.network.provider = new BackwardsCompatibilityProviderAdapter(cannonProvider);

    // refresh hardhat ethers
    // todo this is hacky but somehow normal for hardhat network extension
    hre.ethers.provider = createProviderProxy(hre.network.provider);
  }
}
