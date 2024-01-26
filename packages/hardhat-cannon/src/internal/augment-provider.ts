/*class CannonWrapperProvider extends ProviderWrapper {
=======
class CannonWrapperProvider extends ProviderWrapper {
>>>>>>> origin/main
  artifacts: ChainArtifacts;
  Web3Provider: any;

  constructor(provider: EthereumProvider, artifacts: ChainArtifacts, Web3Provider: any) {
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
  if (hre.network.name !== 'cannon') return;

  const ethersVersion = (hre as any).ethers.version;

  if (typeof ethersVersion !== 'string') {
    throw new HardhatPluginError('hardhat-cannon', 'Could not find ethers.js');
  }

  if (ethersVersion.startsWith('ethers/5.')) {
    const { createProvider } = await import('hardhat/internal/core/providers/construction');
    const { BackwardsCompatibilityProviderAdapter } = await import(
      'hardhat/internal/core/providers/backwards-compatibility'
    );

    const baseProvider = await createProvider(hre.config, hre.network.name, hre.artifacts);
    const cannonProvider = new CannonWrapperProvider(baseProvider, artifacts, (hre as any).ethers.providers.Web3Provider);

    hre.network.provider = new BackwardsCompatibilityProviderAdapter(cannonProvider);

    // refresh hardhat ethers
    // todo this is hacky but somehow normal for hardhat network extension
    const { createProviderProxy } = await import('@nomiclabs/hardhat-ethers/internal/provider-proxy');
    (hre as any).ethers.provider = createProviderProxy(hre.network.provider);
  } else if (ethersVersion.startsWith('6.')) {
    // On this case we are doing nothing.
  } else {
    throw new HardhatPluginError(
      'hardhat-cannon',
      `hardhat-cannon is not compatible with your ethers.js version, v5 or v6 is needed. You are using "${ethersVersion}"`
    );
  }
}
*/

