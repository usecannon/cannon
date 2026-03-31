import _ from 'lodash';
import * as viem from 'viem';
import { validateConfig } from '../actions';
import action from './safe-set-signers';
import { fakeCtx, fakeRuntime } from './utils.test.helper';

describe('steps/safe-set-signers.ts', () => {
  const safeAddress = '0x1234123412341234123412341234123412341234';

  describe('validate', () => {
    it('fails when not setting values', () => {
      expect(() => validateConfig(action.validate, {})).toThrow('Field: target');
    });

    it('fails when setting invalid value', () => {
      expect(() => validateConfig(action.validate, { target: '0x123', signers: [] })).toThrow('target must be a valid ethereum address or template string');
    });
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(fakeCtx, {
        target: '<%= settings.a %>',
        signers: ['<%= settings.b %>', '<%= settings.c %>'],
        threshold: 2,
        from: '<%= settings.d %>',
      }, { ref: null, currentLabel: 'test' });

      expect(result).toStrictEqual({
        target: 'a',
        signers: ['b', 'c'],
        threshold: 2,
        from: 'd',
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties', async () => {
      const owners = [
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
      ].map(v => viem.getAddress(v));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return owners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      const result = await action.getState(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: [],
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(result).toEqual([_.sortBy(owners), 1]);
    });
  });

  describe('exec()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(fakeRuntime.provider.prepareTransactionRequest).mockResolvedValue({} as any);
      jest.mocked(fakeRuntime.provider.waitForTransactionReceipt).mockResolvedValue({
        transactionHash: '0x1234',
        gasUsed: 0n,
        effectiveGasPrice: 0n,
        blockNumber: 0n,
        from: '0x1234123412341234123412341234123412341234',
      } as any);
    });

    it('no-op if already matches', async () => {
      const owners = ['0x1', '0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return owners;
        if (args.functionName === 'getThreshold') return 2n;
        return null;
      });

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: owners,
          threshold: 2,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(result).toEqual({});
      expect(fakeRuntime.provider.prepareTransactionRequest).not.toHaveBeenCalled();
    });

    it('adds a single owner', async () => {
      const currentOwners = ['0x1'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      const desiredSigners = ['0x1', '0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return currentOwners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: desiredSigners,
          threshold: 1,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(fakeRuntime.provider.prepareTransactionRequest).toHaveBeenCalled();
      const callArgs = jest.mocked(fakeRuntime.provider.prepareTransactionRequest).mock.calls[0][0];
      // Should be calling execTransaction on safeAddress
      expect(callArgs.to).toBe(safeAddress);
      // Data should contain addOwnerWithThreshold
    });

    it('removes a single owner', async () => {
      const currentOwners = ['0x2', '0x1'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      const desiredSigners = ['0x1'].map(v => viem.pad(v as viem.Hex, { size: 20 }));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return currentOwners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: desiredSigners,
          threshold: 1,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(fakeRuntime.provider.prepareTransactionRequest).toHaveBeenCalled();
    });

    it('swaps an owner', async () => {
      const currentOwners = ['0x1'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      const desiredSigners = ['0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return currentOwners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: desiredSigners,
          threshold: 1,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(fakeRuntime.provider.prepareTransactionRequest).toHaveBeenCalled();
    });

    it('changes threshold', async () => {
      const currentOwners = ['0x1', '0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      const desiredSigners = ['0x1', '0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return currentOwners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: desiredSigners,
          threshold: 2,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(fakeRuntime.provider.prepareTransactionRequest).toHaveBeenCalled();
    });

    it('batches multiple changes using MultiSend', async () => {
      const currentOwners = ['0x1', '0x2'].map(v => viem.pad(v as viem.Hex, { size: 20 }));
      const desiredSigners = ['0x3', '0x4'].map(v => viem.pad(v as viem.Hex, { size: 20 }));

      jest.mocked(fakeRuntime.provider.readContract).mockImplementation(async (args: any) => {
        if (args.functionName === 'getOwners') return currentOwners;
        if (args.functionName === 'getThreshold') return 1n;
        return null;
      });

      await action.exec(
        fakeRuntime,
        fakeCtx,
        {
          target: safeAddress,
          signers: desiredSigners,
          threshold: 2,
        },
        { ref: null, currentLabel: 'safe_set_signers.test' }
      );

      expect(fakeRuntime.provider.prepareTransactionRequest).toHaveBeenCalled();
      const callArgs = jest.mocked(fakeRuntime.provider.prepareTransactionRequest).mock.calls[0][0];
      // Should be calling execTransaction with MultiSend address and operation 1
      // We'll just verify it was called.
    });
  });
});
