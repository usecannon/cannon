import * as viem from 'viem';
import { fixtureAddress, fixtureSigner, fixtureTransactionReceipt, makeFakeProvider } from '../test/fixtures';
import { CannonSigner } from './';
import { prepareMulticall } from './multicall';
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
      it('applies url alteration for "Qm" hashes', async () => {
        const registry = new FakeCannonRegistry();

        const url = await registry.getUrl('QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i', 13370);

        expect(url.url).toBe('ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i');
      });

      it('just passes through for any non "@" prefixed cannon packages', async () => {
        const registry = new FakeCannonRegistry();

        const url = await registry.getUrl('testing:3.0.0', 13370);

        expect(url.url).toBeFalsy();
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
          providerOnlyRegistry.publish(['dummy-package:0.0.1'], 1, 'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i')
        ).rejects.toThrowError('Missing signer for executing registry operations');
      });

      it('checks signer balance', async () => {
        const registry = createRegistry();

        registry._isPackageRegistered = jest.fn().mockReturnValue(true);
        registry._checkPackageOwnership = jest.fn();

        jest.mocked(provider.getBalance).mockResolvedValue(BigInt(0));

        await expect(() =>
          registry.publish(['dummy-package:0.0.1'], 1, 'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i')
        ).rejects.toThrowError(/Signer at .* is not funded with ETH./);
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
        // getPackageOwner()/getAdditionalPublishers() are overridden directly on the instance above,
        // so the only real provider.readContract call on this path is getPublishFee() -- a single
        // mock covers it. (A prior version of this test queued a second mockResolvedValueOnce meant
        // for getAdditionalPublishers, but that call never reaches provider.readContract because the
        // instance override short-circuits it; the unconsumed queued value silently leaked into
        // whichever later test called readContract next.)
        jest.mocked(provider.readContract).mockResolvedValue('0x69D36DFe281136ef662ED1A2E80a498A5461226D');

        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);

        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await expect(
          registry.publish(
            ['dummy-package:0.0.1@main', 'dummy-package:latest@main'],
            1,
            'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i'
          )
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
        // getPublishFee() is the only readContract call on this path (ownership check is skipped
        // because _isPackageRegistered is stubbed above); a clear literal keeps the value assertion
        // below legible instead of depending on BigInt(signer.address).
        jest.mocked(provider.readContract).mockResolvedValue(BigInt(1234));

        const rx = fixtureTransactionReceipt();

        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);

        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);

        const retValue = await registry.publish(
          ['dummy-package:0.0.1@main', 'dummy-package:latest@main'],
          1,
          'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i'
        );

        // should only return the first receipt because its a multicall
        expect(retValue).toStrictEqual([rx.transactionHash]);

        // This scenario combines 2 calls (setPackageOwnership + publish, both tags batched into one
        // multicall) -- _preparePackageData folds both package refs into a single PackageData with
        // two tags, so _publishPackages emits one 'publish' sub-call plus the unshifted
        // 'setPackageOwnership' sub-call. The send target is the multicall aggregator address
        // (`prepareMulticall`'s constant), not `fakeRegistryAddress` directly -- the registry address
        // only appears as a `target` inside the encoded calldata. The multicall's outer `value` is the
        // sum of its sub-calls' values; only the 'publish' sub-call carries one (`getPublishFee()`,
        // mocked to 1234 above), so the aggregate value is 1234.
        expect(signer.wallet.sendTransaction).toHaveBeenCalledTimes(1);
        expect(signer.wallet.sendTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            to: prepareMulticall([]).address,
            data: expect.stringMatching(/^0x/),
            value: BigInt(1234),
          })
        );
      });
    });

    describe('setPackageOwnership()', () => {
      const buildTxData = (registry: OnChainRegistry) => ({
        ...registry.contract,
        functionName: 'setPackageOwnership',
        value: BigInt(0),
        args: [viem.stringToHex('dummy-package', { size: 32 }), fixtureAddress()],
      });

      it('broadcasts with the hard-coded gas limit and returns the tx hash on success', async () => {
        const registry = createRegistry();

        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);

        const rx = fixtureTransactionReceipt();
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        const result = await registry.setPackageOwnership(buildTxData(registry));

        expect(result).toBe(rx.transactionHash);
        expect(signer.wallet.sendTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ to: fakeRegistryAddress, gas: BigInt(2_500_000) })
        );
      });

      it('throws if the transaction reverts', async () => {
        const registry = createRegistry();

        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);

        const rx = fixtureTransactionReceipt({ status: 'reverted' });
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await expect(registry.setPackageOwnership(buildTxData(registry))).rejects.toThrow(/Transaction failed/);
      });
    });

    describe('setAdditionalPublishers()', () => {
      it('broadcasts with the hard-coded gas limit and returns the tx hash on success', async () => {
        const registry = createRegistry();

        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);

        const rx = fixtureTransactionReceipt();
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        const result = await registry.setAdditionalPublishers('dummy-package', [], [fixtureAddress()]);

        expect(result).toBe(rx.transactionHash);
        expect(signer.wallet.sendTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ to: fakeRegistryAddress, gas: BigInt(2_000_000) })
        );
      });

      it('throws if the transaction reverts', async () => {
        const registry = createRegistry();

        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);

        const rx = fixtureTransactionReceipt({ status: 'reverted' });
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        await expect(registry.setAdditionalPublishers('dummy-package', [], [fixtureAddress()])).rejects.toThrow(
          /Transaction failed/
        );
      });
    });

    describe('unpublish()', () => {
      it('broadcasts a single (non-multicall) tx and returns the tx hash', async () => {
        const registry = createRegistry();

        jest.mocked(provider.estimateContractGas).mockResolvedValue(100n);
        jest.mocked(provider.getBalance).mockResolvedValue(viem.parseEther('1'));
        jest.mocked(provider.getGasPrice).mockResolvedValue(100n);
        jest.mocked(provider.simulateContract).mockResolvedValue({ request: {} } as any);
        jest.mocked(provider.prepareTransactionRequest).mockImplementation(async (args) => args as any);

        const rx = fixtureTransactionReceipt();
        jest.mocked(signer.wallet.sendTransaction).mockResolvedValue(rx.transactionHash);
        jest.mocked(provider.waitForTransactionReceipt).mockResolvedValue(rx);

        const result = await registry.unpublish(['dummy-package:0.0.1@main'], 1);

        expect(result).toStrictEqual([rx.transactionHash]);
        expect(signer.wallet.sendTransaction).toHaveBeenCalledWith(
          expect.objectContaining({ to: fakeRegistryAddress, data: expect.stringMatching(/^0x/) })
        );
      });
    });

    describe('getUrl()', () => {
      it('calls `getPackageUrl`', async () => {
        const provider = makeFakeProvider();
        const registry = createRegistry({ provider });

        jest.mocked(provider.readContract).mockResolvedValue({
          deployUrl: 'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i',
          metaUrl: 'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6j',
          mutability: viem.stringToHex('foobar', { size: 16 }),
          owner: signer.address,
        });

        const url = await registry.getUrl('dummy-package:0.0.1@main', 13370);

        expect(url.url).toBe('ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i');
        expect(url.mutability).toBe('foobar');

        expect(jest.mocked(provider.readContract).mock.lastCall?.[0]).toMatchObject({
          functionName: 'getPackageInfo',
          args: [
            viem.stringToHex('dummy-package', { size: 32 }),
            viem.stringToHex('0.0.1', { size: 32 }),
            viem.stringToHex('13370-main', { size: 32 }),
          ],
        });
      });

      it('decodes bytes16 mutability field from on-chain hex to string', async () => {
        const provider = makeFakeProvider();
        const registry = createRegistry({ provider });

        // The on-chain registry stores mutability as bytes16 (right-padded hex).
        // Before the fix, the raw hex string was returned instead of the decoded value,
        // causing mutability checks like `=== 'version'` to always fail.
        // Note: empty mutability is not tested here because stringToHex('', {size:16}) produces
        // 16 null bytes, which hexToString decodes to '\u0000' rather than ''. In practice,
        // the on-chain contract only uses 'version' and 'tag' as meaningful mutability values.
        for (const mutability of ['version', 'tag'] as const) {
          jest.mocked(provider.readContract).mockResolvedValue({
            deployUrl: 'ipfs://QmV1kMdjDegcKrvSddsTmRGyCwnYERqN9o1K56g4Mw7F6i',
            metaUrl: '',
            mutability: viem.stringToHex(mutability, { size: 16 }),
            owner: signer.address,
          });

          const url = await registry.getUrl('dummy-package:0.0.1@main', 13370);

          expect(url.mutability).toBe(mutability);
          // Make sure we never leak the raw hex value
          expect(url.mutability).not.toMatch(/^0x/);
        }
      });
    });
  });
});
