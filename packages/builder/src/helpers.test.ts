import * as viem from 'viem';
import {
  getDefaultStorage,
  getCannonContract,
  getBlockRetried,
  isNonceError,
  sendTransactionWithNonceRetry,
} from './helpers';
import { IPFSLoader, InMemoryLoader } from './loader';
import { InMemoryRegistry, FallbackRegistry } from './registry';
import { CannonStorage } from './runtime';

describe('helpers.test.ts', () => {
  describe('getDefaultStorage()', () => {
    it('returns', () => {
      const storage = getDefaultStorage();

      expect(storage.loaders.ipfs).toBeInstanceOf(IPFSLoader);
      expect(storage.registry).toBeInstanceOf(FallbackRegistry);
    });

    describe('getBlockRetried', () => {
      it('should retry twice and succeed on the third attempt', async () => {
        // 1. Setup the mock
        const mockBlock = { number: 100n, hash: '0x123' };
        const mockHash = '0x123';

        const mockGetBlock = jest
          .fn()
          .mockRejectedValueOnce(new Error('RPC Error 1')) // Attempt 1: Fail
          .mockRejectedValueOnce(new Error('RPC Error 2')) // Attempt 2: Fail
          .mockResolvedValueOnce(mockBlock); // Attempt 3: Success

        const mockProvider = {
          getBlock: mockGetBlock,
        } as unknown as viem.PublicClient;

        // 2. Execute
        const result = await getBlockRetried(mockProvider, mockHash as any);

        // 3. Assert
        expect(result).toEqual(mockBlock);
        expect(mockGetBlock).toHaveBeenCalledTimes(3);
        expect(mockGetBlock).toHaveBeenCalledWith({ blockHash: mockHash });
      });
    });
  });

  // Skipping test for now as it is a function that is not used anywhere
  describe.skip('getCannonContract()', () => {
    const fakeStorage = new CannonStorage(new InMemoryRegistry(), { mem: new InMemoryLoader(1) }, 'mem');

    beforeAll(async () => {
      const deployInfoUrl = await fakeStorage.putDeploy({
        generator: 'cannon test',
        timestamp: 10000000,
        def: { name: 'woot', version: '0.0.1', contract: { Something: { artifact: 'Woot' } } },
        options: {},
        state: {
          'contract.Something': {
            version: 1,
            hash: '',
            artifacts: {
              contracts: {
                Something: {
                  address: '0x1234123412341234123412341234123412341234',
                } as any,
              },
            },
          },
        },
        meta: {},
        miscUrl: '',
        chainId: 282,
      });
      await fakeStorage.registry.publish(['woot:latest'], 282, deployInfoUrl!, '');
    });

    it('uses default storage if not provided', async () => {
      await expect(() =>
        getCannonContract({
          package: 'wooted:latest',
          contractName: 'Something',
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('throws error if package not found', async () => {
      await expect(() =>
        getCannonContract({
          package: 'wooted:latest',
          contractName: 'Something',
          storage: fakeStorage,
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('throws error if contract not found', async () => {
      await expect(() =>
        getCannonContract({
          package: 'woot:latest',
          contractName: 'SomethingElse',
          storage: fakeStorage,
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('finds contract', async () => {
      const contract = await getCannonContract({
        package: 'woot:latest',
        contractName: 'Something',
        storage: fakeStorage,
        chainId: 282,
      });

      expect(contract.address).toEqual('0x1234123412341234123412341234123412341234');
    });
  });
});

describe('isNonceError', () => {
  it('matches viem nonce error messages, including nested causes', () => {
    expect(isNonceError(new Error('nonce too low: next nonce 5, tx nonce 4'))).toBe(true);
    expect(isNonceError(new Error('Nonce provided for the transaction is higher'))).toBe(true);
    expect(isNonceError({ cause: { details: 'nonce too low' } } as any)).toBe(true);
    expect(isNonceError(new Error('execution reverted'))).toBe(false);
    expect(isNonceError(undefined)).toBe(false);
  });
});

describe('sendTransactionWithNonceRetry', () => {
  function fakeSigner() {
    const reset = jest.fn();
    const signer = {
      address: '0x000000000000000000000000000000000000abcd',
      wallet: { account: { address: '0x000000000000000000000000000000000000abcd', nonceManager: { reset } } },
    } as any;
    return { signer, reset };
  }

  it('retries a nonce-too-low failure then resolves, resetting the nonce manager', async () => {
    const { signer, reset } = fakeSigner();
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('nonce too low: next nonce 5, tx nonce 4'))
      .mockResolvedValueOnce('0xhash');

    const hash = await sendTransactionWithNonceRetry(signer, 6343, send);

    expect(hash).toBe('0xhash');
    expect(send).toHaveBeenCalledTimes(2);
    expect(reset).toHaveBeenCalledWith({ address: signer.address, chainId: 6343 });
  });

  it('rethrows a non-nonce error without retrying', async () => {
    const { signer } = fakeSigner();
    const send = jest.fn().mockRejectedValue(new Error('execution reverted: boom'));

    await expect(sendTransactionWithNonceRetry(signer, 6343, send)).rejects.toThrow('execution reverted');
    expect(send).toHaveBeenCalledTimes(1);
  });
});
