import { ethers } from 'ethers';
import '../actions';
import { ChainBuilderContextWithHelpers, ContractArtifact } from '../types';
import action from './contract';

import { fakeRuntime, fakeCtx } from './testUtils';
import { makeArachnidCreate2Txn } from '../create2';

describe('setps/contract.ts', () => {

  describe('configInject()', () => {
    it('injects all fields', async () => {

      const result = action.configInject(fakeCtx, {
        artifact: '<%= settings.a %><%= settings.b %>',

        from: '<%= settings.c %>',
        nonce: '<%= settings.d %>',
        abi: '<%= settings.c %><%= settings.d %>',
        args: ['<%= settings.d %><%= settings.a %>', { abc: '<%= settings.a %><%= settings.b %><%= settings.c %>' }],
        libraries: { dcba: '<%= a %>' },

        // used to force new copy of a contract (not actually used)
        salt: '<%= settings.a %><%= settings.c %>',

        value: '<%= settings.b %><%= settings.d %>',
        overrides: {
          gasLimit: 1234,
          gasPrice: '1234',
          priorityGasPrice: '1234',
        },
      });

      expect(result).toStrictEqual({
        artifact: 'ab',

        from: 'c',
        nonce: 'd',
        abi: 'cd',
        args: ['da', { abc: 'abc' }],
        libraries: { dcba: 'a' },

        // used to force new copy of a contract (not actually used)
        salt: 'ac',

        value: 'bd',
        overrides: {
          gasLimit: 1234,
          gasPrice: '1234',
          priorityGasPrice: '1234',
        },
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {

      jest.mocked(fakeRuntime.getArtifact).mockResolvedValue({
        bytecode: '0xabcd'
      } as ContractArtifact)

      const result = await action.getState(fakeRuntime, fakeCtx, { artifact: 'hello' });

      expect(result).toStrictEqual({
        bytecode: '0xabcd',
        args: [],
        salt: undefined,
        value: '1234',
      })
    });

    it('resolves correct even if there are libraries in the contract', async () => {

    });

    it('resolves correct properties with maximal config', async () => {
      const result = await action.getState(fakeRuntime, fakeCtx, {
        artifact: 'hello',
        args: ['one', 'two', { three: 'four' }],
        salt: 'wohoo',
        value: '1234'
      });

      expect(result).toStrictEqual({
        bytecode: '0xabcd',
        args: ['one', 'two', '{"three":"four"}'],
        salt: undefined,
        value: '1234',
      })
    });
  });

  describe('exec()', () => {

    describe('when create2 = true', () => {
      it('works if contract already deployed', async () => {
        jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0xabcdef');

        const result = await action.exec(fakeRuntime, fakeCtx, {
          artifact: 'hello',
          create2: true,
          args: ['one', 'two', { three: 'four' }],
          salt: 'wohoo',
          value: '1234'
        }, { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' });

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              deployTxnHash: ''
            }
          }
        });


      });

      it('works if contract needs to be deployed', async () => {

        jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0x');

        const sendTxnFn = jest.fn();

        jest.mocked(fakeRuntime.getDefaultSigner).mockResolvedValue({
          sendTransaction: sendTxnFn
        } as unknown as ethers.Signer);

        const result = await action.exec(fakeRuntime, fakeCtx, {
          artifact: 'hello',
          create2: true,
          args: ['one', 'two', { three: 'four' }],
          salt: 'wohoo',
          value: '1234'
        }, { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' });

        expect(result).toStrictEqual({

        });

        expect(sendTxnFn).toBeCalledWith(makeArachnidCreate2Txn(
          'wohoo',
          '0xabcd'
        ));

      });
    });

    describe('when create2 = false', () => {
      it('deploys with specified nonce', async () => {
        const result = await action.exec(fakeRuntime, fakeCtx, {
          artifact: 'hello',
          args: ['one', 'two', { three: 'four' }],
          salt: 'wohoo',
          value: '1234'
        }, { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' });

        expect(result).toStrictEqual({

        });
      });

      it('deploys with specified signer fromCall', async () => {
        const result = await action.exec(fakeRuntime, fakeCtx, {
          artifact: 'hello',
          from: '0x1234123412341234123412341234123412341234',
          args: ['one', 'two', { three: 'four' }],
          salt: 'wohoo',
          value: '1234'
        }, { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' });

        expect(result).toStrictEqual({

        });
      });

      it('deploys with default signer', async () => {
        const result = await action.exec(fakeRuntime, fakeCtx, {
          artifact: 'hello',
          args: ['one', 'two', { three: 'four' }],
          salt: 'wohoo',
          value: '1234'
        }, { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' });

        expect(result).toStrictEqual({

        });
      });
    });
  });
});
