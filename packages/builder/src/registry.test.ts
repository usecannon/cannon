import { ethers } from 'ethers';
import { CannonRegistry, OnChainRegistry } from './registry';
import { CannonWrapperGenericProvider } from './error/provider';

jest.mock('./error/provider');

describe('registry.ts', () => {
  describe('CannonRegistry', () => {
    class FakeCannonRegistry extends CannonRegistry {
      getLabel(): string {
        return 'fake';
      }

      async publish(/* packagesNames: string[], variant: string, url: string */): Promise<string[]> {
        return [];
      }
    }

    describe('getUrl()', () => {
      it('applies url alteration for "@ipfs" prefixed cannon packages', async () => {
        const registry = new FakeCannonRegistry();

        const url = await registry.getUrl('@ipfs:Qmwohoo', 13370);

        expect(url).toBe('ipfs://Qmwohoo');
      });

      it('just passes through for any non "@" prefixed cannon packages', async () => {
        const registry = new FakeCannonRegistry();

        const url = await registry.getUrl('testing:3.0.0', 13370);

        expect(url).toBe(null);
      });
    });
  });

  describe('OnChainRegistry', () => {
    let provider: ethers.providers.Provider;
    let signer: ethers.Signer;
    let registry: OnChainRegistry;
    let providerOnlyRegistry: OnChainRegistry;

    const fakeRegistryAddress = '0x1234123412341234123412341234123412341234';

    beforeAll(async () => {
      provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());
      (provider._isProvider as any) = true;
      signer = ethers.Wallet.createRandom().connect(provider);
      registry = new OnChainRegistry({
        address: fakeRegistryAddress,
        signerOrProvider: signer,
        overrides: { gasLimit: 1234000 },
      });

      providerOnlyRegistry = new OnChainRegistry({ signerOrProvider: provider, address: fakeRegistryAddress });
    });

    describe('constructor', () => {
      it('sets fields with signer', async () => {
        expect(registry.provider).toBe(provider);
        expect(registry.signer).toBe(signer);
        expect(registry.contract.address).toBe(fakeRegistryAddress);
        expect(registry.overrides.gasLimit).toBe(1234000);
      });

      it('sets fields with provider', async () => {
        expect(providerOnlyRegistry.signer).toBeFalsy();
        expect(providerOnlyRegistry.provider).toBe(provider);
      });
    });

    describe('publish()', () => {
      it('throws if signer is not specified', async () => {
        await expect(() =>
          providerOnlyRegistry.publish(['dummyPackage:0.0.1'], 1, 'ipfs://Qmsomething')
        ).rejects.toThrowError('Missing signer needed for publishing');
      });

      it('checks signer balance', async () => {
        jest.mocked(provider.getBalance).mockResolvedValue(ethers.BigNumber.from(0));

        await expect(() => registry.publish(['dummyPackage:0.0.1'], 1, 'ipfs://Qmsomething')).rejects.toThrowError(
          /Signer at .* is not funded with ETH./
        );
      });

      it('makes call to register all specified packages, and returns list of published packages', async () => {
        jest.mocked(provider.getBalance).mockResolvedValue(ethers.utils.parseEther('1'));
        jest.mocked(provider.getFeeData).mockResolvedValue({
          lastBaseFeePerGas: null,
          maxFeePerGas: null,
          maxPriorityFeePerGas: null,
          gasPrice: ethers.utils.parseUnits('10', 'gwei'),
        });

        jest.mocked(provider.resolveName).mockResolvedValue(fakeRegistryAddress);

        jest.mocked(provider.getNetwork).mockResolvedValue({ chainId: 12341234, name: 'fake' });

        jest
          .mocked(provider.sendTransaction)
          .mockResolvedValueOnce({
            wait: async () => ({ logs: [], transactionHash: '0x1234' } as unknown as ethers.providers.TransactionReceipt),
          } as any)
          .mockResolvedValueOnce({
            wait: async () => ({ logs: [], transactionHash: '0x5678' } as unknown as ethers.providers.TransactionReceipt),
          } as any);

        const retValue = await registry.publish(['dummyPackage:0.0.1', 'anotherPkg:1.2.3'], 1, 'ipfs://Qmsomething');

        // should only return the first receipt because its a multicall
        expect(retValue).toStrictEqual(['0x1234']);

        // TODO: check the transaction which was sent (its hard to do here because it comes in as the signed txn)
      });
    });

    describe('getUrl()', () => {
      it('calls (and returns) from super first', async () => {
        const url = await registry.getUrl('@ipfs:Qmwohoo', 13370);

        expect(url).toBe('ipfs://Qmwohoo');
      });

      it('calls `getPackageUrl`', async () => {
        jest.mocked(provider.call).mockResolvedValue(ethers.utils.defaultAbiCoder.encode(['string'], ['ipfs://Qmwohoo']));

        const url = await registry.getUrl('dummyPackage:0.0.1', 13370);

        expect(url).toBe('ipfs://Qmwohoo');

        expect(jest.mocked(provider.call).mock.lastCall?.[0].data).toBe(
          registry.contract.interface.encodeFunctionData('getPackageUrl', [
            ethers.utils.formatBytes32String('dummyPackage'),
            ethers.utils.formatBytes32String('0.0.1'),
            ethers.utils.formatBytes32String('13370-main'),
          ])
        );
      });
    });
  });
});
