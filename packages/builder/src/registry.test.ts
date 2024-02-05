import * as viem from 'viem';
import { CannonRegistry, OnChainRegistry } from './registry';
import { fixtureSigner, makeFakeProvider } from '../test/fixtures';
import { CannonSigner } from '.';


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
    let provider: viem.PublicClient;
    let signer: CannonSigner;
    let registry: OnChainRegistry;
    let providerOnlyRegistry: OnChainRegistry;

    const fakeRegistryAddress = '0x1234123412341234123412341234123412341234';

    beforeAll(async () => {
      provider = makeFakeProvider();
      signer = fixtureSigner();
      registry = new OnChainRegistry({
        address: fakeRegistryAddress,
        provider,
        signer,
        overrides: { gasLimit: 1234000 },
      });

      providerOnlyRegistry = new OnChainRegistry({ provider, address: fakeRegistryAddress });
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
        jest.mocked(provider.getBalance).mockResolvedValue(BigInt(0));

        await expect(() => registry.publish(['dummyPackage:0.0.1'], 1, 'ipfs://Qmsomething')).rejects.toThrowError(
          /Signer at .* is not funded with ETH./
        );
      });

      it('makes call to register all specified packages, and returns list of published packages', async () => {
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getFeeHistory).mockResolvedValue({
          //lastBaseFeePerGas: null,
          baseFeePerGas: [],
          gasUsedRatio: [],
          oldestBlock: BigInt(0),
          //gasPrice: viem.parseGwei('10'),
        });

        //jest.mocked(provider.resolveName).mockResolvedValue(fakeRegistryAddress);

        jest.mocked(provider.getChainId).mockResolvedValue(12341234);

        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);

        jest
          .mocked(signer.wallet.sendTransaction)
          .mockResolvedValueOnce({} as any)
          .mockResolvedValueOnce({} as any);

        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue({
          transactionHash: '0x1234',
        });

        const retValue = await registry.publish(
          ['dummyPackage:0.0.1@main', 'anotherPkg:1.2.3@main'],
          1,
          'ipfs://Qmsomething'
        );

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
        jest.mocked(provider.simulateContract).mockResolvedValue({ result: 'ipfs://Qmwohoo' } as any);

        const url = await registry.getUrl('dummyPackage:0.0.1@main', 13370);

        expect(url).toBe('ipfs://Qmwohoo');

        expect(jest.mocked(provider.simulateContract).mock.lastCall?.[0]).toMatchObject({
          functionName: 'getPackageUrl',
          args: [
            viem.stringToHex('dummyPackage', { size: 32 }),
            viem.stringToHex('0.0.1', { size: 32 }),
            viem.stringToHex('13370-main', { size: 32 }),
          ],
        });
      });
    });
  });
});
