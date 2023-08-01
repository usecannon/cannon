import { ethers } from 'ethers';
import { handleTxnError } from './index';

describe('error/index.ts', () => {
  const FAKE_REVERT_REASON =
    '0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000096974206661696c65640000000000000000000000000000000000000000000000';

  describe('handleTxnError()', () => {
    const FakeProvider = ({
      send: jest.fn().mockImplementation(f => {
        switch (f) {
          case 'web3_clientVersion':
            return 'dummy';
          default:
            return 'unknown send';
        }
      }),
      getSigner: jest.fn()
    } as unknown) as ethers.providers.JsonRpcProvider;

    it('throws the original error when its unknown', async () => {
      const fakeError = new Error('this is an error that nobody knows about');
      await expect(() => {
        return handleTxnError({}, FakeProvider, fakeError);
      }).rejects.toThrow(fakeError);
    });

    it('captures CALL_EXCEPTION', async () => {
      const fakeError = { code: 'CALL_EXCEPTION', transaction: {}, data: FAKE_REVERT_REASON };
      await expect(() => handleTxnError({}, FakeProvider, fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('captures and unwraps UNPREDICTABLE_GAS_LIMIT', async () => {
      const fakeError = {
        code: 'UNPREDICTABLE_GAS_LIMIT',
        error: { code: 'CALL_EXCEPTION', transaction: {}, data: FAKE_REVERT_REASON }
      };
      await expect(() => handleTxnError({}, FakeProvider, fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('captures web3 code -32603', async () => {
      const fakeError = { code: -32603, transaction: {}, data: { originalError: { data: FAKE_REVERT_REASON } } };
      await expect(() => handleTxnError({}, FakeProvider, fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('captures error reason "processing response error"', async () => {
      const fakeError = {
        reason: 'processing response error',
        requestBody: '{ "params": [{}]}',
        error: { data: FAKE_REVERT_REASON }
      };
      await expect(() => handleTxnError({}, FakeProvider, fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('calls a trace when running against anvil', async () => {
      const provider = jest.fn().mockImplementation(() => {
        return {
          send: (call: string) => {
            if (call === 'web3_clientVersion') {
              return 'anvil';
            } else if (call === 'trace_transaction') {
              return [];
            }
          }
        };
      });

      const fakeError = { code: 'CALL_EXCEPTION', transaction: {}, data: FAKE_REVERT_REASON };
      await expect(() => handleTxnError({}, new provider(), fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('parses "Panic" and "Error" builtin solidity errors', async () => {
      // verify a "panic"
      const fakeError = { code: 'CALL_EXCEPTION', transaction: {}, data: FAKE_REVERT_REASON };
      await expect(() => handleTxnError({}, FakeProvider, fakeError)).rejects.toThrowError('Error("it failed")');
    });

    it('parses console.log in traces', async () => {
      // return a trace with a console.log
      const provider = jest.fn().mockImplementation(() => {
        return {
          send: (call: string) => {
            if (call === 'web3_clientVersion') {
              return 'anvil';
            } else if (call === 'trace_transaction') {
              return [];
            }
          }
        };
      });

      const fakeError = { code: 'CALL_EXCEPTION', transaction: {}, data: FAKE_REVERT_REASON };
      await expect(() => handleTxnError({}, new provider(), fakeError)).rejects.toThrowError('Error("it failed")');
    });
  });
});
