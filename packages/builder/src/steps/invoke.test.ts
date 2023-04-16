import _ from 'lodash';
import '../actions';
import action from './invoke';
import { fakeCtx, fakeRuntime } from './testUtils';

describe('setps/invoke.ts', () => {
  describe('configInject()', () => {
    it('injects all fields', async () => {

      const result = action.configInject(fakeCtx, {
        target: ['<%= settings.a %>'],
        func: '<%= settings.b %>',
        from: '<%= settings.c %>',
        abi: '<%= settings.c %><%= settings.d %>',
        args: ['<%= settings.d %><%= settings.a %>', { abc: '<%= settings.a %><%= settings.b %><%= settings.c %>' }],

        value: '<%= settings.b %><%= settings.d %>',
        overrides: {
          gasLimit: 1234,
          gasPrice: '1234',
          priorityGasPrice: '1234',
        },
      });

      expect(result).toStrictEqual({
        target: ['a'],
        func: 'b',
        from: 'c',
        abi: 'cd',
        args: ['da', { abc: 'abc' }],

        value: 'bd',
        overrides: {
          gasLimit: 1234,
          gasPrice: '1234',
          priorityGasPrice: '1234',
        }
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      const result = await action.getState(fakeRuntime, fakeCtx, { target: ['Wohoo'], func: 'something' });

      expect(result).toStrictEqual({
        to: ['0x1234123412341234123412341234123412341234'],
        func: 'something',
        args: [],
        value: '0',
      });
    });

    it('resolves correct properties with maximal config', async () => {
      const result = await action.getState(fakeRuntime, fakeCtx, {
        target: ['Wohoo'],
        func: 'something',
        args: ['split', { wave: 'form' }],
        value: '1234'
      });

      expect(result).toStrictEqual({
        to: ['0x1234123412341234123412341234123412341234'],
        func: 'something',
        args: ['split', '{"wave":"form"}'],
        value: '1234',
      });
    });
  });

  describe('exec()', () => {
    it('works and parses all information from transaction result', async () => {

      const fakeContractInfo = { 
        contracts: { 
          Woot: { 
            address: '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd', 
            abi: [
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "firstArg",
                    "type": "string"
                  },
                  {
                    "internalType": "address",
                    "name": "secondArg",
                    "type": "string"
                  },
                  {
                    "internalType": "address",
                    "name": "thirdArg",
                    "type": "string"
                  }
                ],
                "name": "something",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ], 
            deployTxn: '0x' 
          } 
        } 
      };

      const result = action.exec(fakeRuntime, _.merge(fakeContractInfo, fakeCtx), {
        target: ['Woot'],
        func: 'something',
        args: ['foo', { bar: 'baz' }],
        value: '1234',
        factory: {
          Whoof: {
            event: 'SomethingHappened',
            arg: 1,
            abiOf: ['Woot', 'What'],
            constructorArgs: ['whoot']
          }
        }
      }, { name: 'fun', version: '1.0.0', currentLabel: 'invoke.something' })

      expect(result).toStrictEqual({

      })
    });
  });
});
