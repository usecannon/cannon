import { ChainArtifacts, handleTxnError } from '@usecannon/builder';
import { BackwardsCompatibilityProviderAdapter } from 'hardhat/internal/core/providers/backwards-compatibility';
import { createProvider } from 'hardhat/internal/core/providers/construction';
import { ProviderWrapper } from 'hardhat/internal/core/providers/wrapper';
import { EthereumProvider, HardhatRuntimeEnvironment, RequestArguments } from 'hardhat/types';

import type { ethers } from 'ethers';

class CannonWrapperProvider extends ProviderWrapper {
  artifacts: ChainArtifacts;
  Web3Provider: ethers.providers.Web3Provider;

  constructor(provider: EthereumProvider, artifacts: ChainArtifacts, Web3Provider: ethers.providers.Web3Provider) {
    super(provider);
    this.artifacts = artifacts;
    this.Web3Provider = Web3Provider;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    try {
      return this._wrappedProvider.request(args);
    } catch (err) {
      const provider = new (this as any).Web3Provider(this._wrappedProvider);
      await handleTxnError(this.artifacts, provider, err);
    }
  }
}

export async function augmentProvider(hre: HardhatRuntimeEnvironment, artifacts: ChainArtifacts = {}) {
  const { createProviderProxy } = await import('@nomiclabs/hardhat-ethers/internal/provider-proxy');

  if (hre.network.name === 'cannon') {
    hre.config.networks.cannon.url = `http://127.0.0.1:${hre.config.networks.cannon.port}`;

    const baseProvider = await createProvider(hre.config, hre.network.name, hre.artifacts);

    const cannonProvider = new CannonWrapperProvider(baseProvider, artifacts, (hre as any).ethers.providers.Web3Provider);

    hre.network.provider = new BackwardsCompatibilityProviderAdapter(cannonProvider);

    // refresh hardhat ethers
    // todo this is hacky but somehow normal for hardhat network extension
    (hre as any).ethers.provider = createProviderProxy(hre.network.provider);
  }
}
