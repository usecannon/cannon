import * as viem from 'viem';
import { fixtureAddress, fixtureSigner, fixtureTransactionReceipt, makeFakeProvider } from '../test/fixtures';
import { CannonSigner } from './';
import { CannonRegistry, OnChainRegistry } from './registry';

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

    const createRegistry = (overrides: any = {}) =>
      new OnChainRegistry({
        address: fakeRegistryAddress,
        provider,
        signer,
        overrides: { gasLimit: 1234000 },
        ...overrides,
      });

    beforeAll(async () => {
      provider = makeFakeProvider();
      signer = fixtureSigner();
      registry = createRegistry();

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
          providerOnlyRegistry.publish(['dummy-package:0.0.1'], 1, 'ipfs://Qmsomething')
        ).rejects.toThrowError('Missing signer for executing registry operations');
      });

      it('checks signer balance', async () => {
        const registry = createRegistry();

        registry._isPackageRegistered = jest.fn().mockReturnValue(true);
        registry._checkPackageOwnership = jest.fn();

        jest.mocked(provider.getBalance).mockResolvedValue(BigInt(0));

        await expect(() => registry.publish(['dummy-package:0.0.1'], 1, 'ipfs://Qmsomething')).rejects.toThrowError(
          /Signer at .* is not funded with ETH./
        );
      });

      it('throws if signer is not the owner of the package', async () => {
        const registry = createRegistry();

        registry.getPackageOwner = jest.fn().mockImplementation(() => fixtureAddress());
        registry.getAdditionalPublishers = jest.fn().mockReturnValue([]);

        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));

        jest.mocked(provider.getFeeHistory).mockResolvedValue({
          //lastBaseFeePerGas: null,
          baseFeePerGas: [],
          gasUsedRatio: [],
          oldestBlock: BigInt(0),
          //gasPrice: viem.parseGwei('10'),
        });

        jest.mocked(provider.getChainId).mockResolvedValue(12341234);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest
          .mocked(provider.readContract)
          .mockResolvedValueOnce('0x69D36DFe281136ef662ED1A2E80a498A5461226D')
          .mockResolvedValueOnce(['0x69D36DFe281136ef662ED1A2E80a498A5461226D']);

        jest
          .mocked(signer.wallet.writeContract)
          .mockResolvedValueOnce({} as any)
          .mockResolvedValueOnce({} as any);

        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await expect(
          registry.publish(['dummy-package:0.0.1@main', 'dummy-package:latest@main'], 1, 'ipfs://Qmsomething')
        ).rejects.toThrow(`Signer "${signer.address}" does not have publishing permissions on the "dummy-package" package`);
      });

      it('makes call to register all specified packages, and returns list of published packages', async () => {
        const registry = createRegistry();

        registry._isPackageRegistered = jest.fn().mockReturnValue(false);

        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));

        jest.mocked(provider.getFeeHistory).mockResolvedValue({
          //lastBaseFeePerGas: null,
          baseFeePerGas: [],
          gasUsedRatio: [],
          oldestBlock: BigInt(0),
          //gasPrice: viem.parseGwei('10'),
        });

        jest.mocked(provider.getChainId).mockResolvedValue(12341234);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.readContract).mockResolvedValue(signer.address);

        jest
          .mocked(signer.wallet.writeContract)
          .mockResolvedValueOnce({} as any)
          .mockResolvedValueOnce({} as any);

        const rx = fixtureTransactionReceipt();
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);

        const retValue = await registry.publish(
          ['dummy-package:0.0.1@main', 'dummy-package:latest@main'],
          1,
          'ipfs://Qmsomething'
        );

        // should only return the first receipt because its a multicall
        expect(retValue).toStrictEqual([rx.transactionHash]);

        // TODO: check the transaction which was sent (its hard to do here because it comes in as the signed txn)
      });
    });

    describe('getUrl()', () => {
      it('calls (and returns) from super first', async () => {
        const url = await registry.getUrl('@ipfs:Qmwohoo', 13370);

        expect(url).toBe('ipfs://Qmwohoo');
      });

      it('calls `getPackageUrl`', async () => {
        const provider = makeFakeProvider();
        const registry = createRegistry({ provider });

        jest.mocked(provider.readContract).mockResolvedValue('ipfs://Qmwohoo');

        const url = await registry.getUrl('dummy-package:0.0.1@main', 13370);

        expect(url).toBe('ipfs://Qmwohoo');

        expect(jest.mocked(provider.readContract).mock.lastCall?.[0]).toMatchObject({
          functionName: 'getPackageUrl',
          args: [
            viem.stringToHex('dummy-package', { size: 32 }),
            viem.stringToHex('0.0.1', { size: 32 }),
            viem.stringToHex('13370-main', { size: 32 }),
          ],
        });
      });
    });
  });
});
