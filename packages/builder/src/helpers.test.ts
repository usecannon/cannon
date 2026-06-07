import * as viem from 'viem';
import { getDefaultStorage, getCannonContract, getBlockRetried, sendTransactionWithRetry } from './helpers';
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

describe('sendTransactionWithRetry', () => {
  // signer whose wallet account is a viem local account carrying a nonce manager
  function fakeLocalSigner() {
    const reset = jest.fn();
    const signer = {
      address: '0x000000000000000000000000000000000000abcd',
      wallet: {
        chain: { id: 6343 },
        account: { type: 'local', address: '0x000000000000000000000000000000000000abcd', nonceManager: { reset } },
      },
    } as any;
    return { signer, reset };
  }

  // signer backed by a remote (json-rpc) account, e.g. Frame — no nonce manager to reset
  function fakeJsonRpcSigner() {
    return {
      address: '0x000000000000000000000000000000000000abcd',
      wallet: { chain: { id: 6343 }, account: undefined },
    } as any;
  }

  it('retries any failed broadcast, resetting the nonce manager of a local account', async () => {
    const { signer, reset } = fakeLocalSigner();
    const send = jest.fn().mockRejectedValueOnce(new Error('intermittent rpc failure')).mockResolvedValueOnce('0xhash');

    const hash = await sendTransactionWithRetry(signer, send);

    expect(hash).toBe('0xhash');
    expect(send).toHaveBeenCalledTimes(2);
    expect(reset).toHaveBeenCalledWith({ address: signer.address, chainId: 6343 });
  });

  it('retries even when the signer has no nonce manager to reset', async () => {
    const signer = fakeJsonRpcSigner();
    const send = jest.fn().mockRejectedValueOnce(new Error('nonce too low')).mockResolvedValueOnce('0xhash');

    await expect(sendTransactionWithRetry(signer, send)).resolves.toBe('0xhash');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('falls back to eth_chainId when the wallet has no configured chain', async () => {
    const { signer, reset } = fakeLocalSigner();
    signer.wallet.chain = undefined;
    signer.wallet.getChainId = jest.fn().mockResolvedValue(6343);
    const send = jest.fn().mockRejectedValueOnce(new Error('nonce too low')).mockResolvedValueOnce('0xhash');

    await expect(sendTransactionWithRetry(signer, send)).resolves.toBe('0xhash');
    expect(reset).toHaveBeenCalledWith({ address: signer.address, chainId: 6343 });
  });

  it('does not retry when the user explicitly rejected the transaction', async () => {
    const { signer, reset } = fakeLocalSigner();
    // viem wraps the EIP-1193 rejection a few levels down in the `cause` chain
    const rejection = new viem.BaseError('could not send transaction', {
      cause: new viem.UserRejectedRequestError(new Error('User denied transaction signature')),
    });
    const send = jest.fn().mockRejectedValue(rejection);

    await expect(sendTransactionWithRetry(signer, send)).rejects.toThrow('could not send transaction');
    expect(send).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });

  it('rejects with the last error after all retries are exhausted', async () => {
    const { signer } = fakeLocalSigner();
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('nonce too low: next nonce 5, tx nonce 4'))
      .mockRejectedValueOnce(new Error('nonce too low: next nonce 6, tx nonce 5'))
      .mockRejectedValueOnce(new Error('nonce too low: next nonce 7, tx nonce 6'))
      .mockRejectedValueOnce(new Error('nonce too low: next nonce 8, tx nonce 7'));

    await expect(sendTransactionWithRetry(signer, send)).rejects.toThrow('nonce too low: next nonce 8');
    expect(send).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });
});
