import _ from 'lodash';
import { validateConfig } from '../actions';
import action from './invoke';
import { fakeCtx, fakeRuntime } from './utils.test.helper';
import { PackageReference } from '../package-reference';

describe('steps/invoke.ts', () => {
  const fakeContractInfo = {
    contracts: {
      What: {
        address: '0x0987098709870987098709870987098709870978',
        abi: [],
      },
      Woot: {
        address: '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: 'firstArg',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'secondArg',
                type: 'address',
              },
            ],
            name: 'SomethingHappened',
            type: 'event',
          },
          {
            inputs: [
              {
                internalType: 'address',
                name: 'firstArg',
                type: 'address',
              },
              {
                // without name triggers viem to parse the event differently
                internalType: 'address',
                type: 'address',
              },
            ],
            name: 'SomethingElseHappened',
            type: 'event',
          },
          {
            inputs: [
              {
                internalType: 'address',
                name: 'firstArg',
                type: 'string',
              },
              {
                internalType: 'address',
                name: 'secondArg',
                type: 'string',
              },
              {
                internalType: 'address',
                name: 'thirdArg',
                type: 'string',
              },
            ],
            name: 'something',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        deployTxn: '0x',
      },
    },
  };

  describe('validate', () => {
    it('fails when not setting values', () => {
      expect(() => validateConfig(action.validate, {})).toThrow('Field: target');
    });

    it('fails when setting invalid value', () => {
      expect(() => validateConfig(action.validate, { target: 'owner()', invalid: ['something'] })).toThrow(
        "Unrecognized key(s) in object: 'invalid'"
      );
    });
  });

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
          gasLimit: '<%= settings.gasLimit %>',
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
          gasLimit: '20000',
        },
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      const result = await action.getState(
        fakeRuntime,
        _.merge({}, fakeContractInfo, fakeCtx),
        {
          target: ['Woot'],
          func: 'something',
        },
        { ref: null, currentLabel: 'invoke.Invoke' }
      );

      expect(result).toContainEqual({
        to: [fakeContractInfo.contracts.Woot.address],
        func: 'something',
        args: undefined,
        value: '0',
      });
    });

    it('resolves correct properties with maximal config', async () => {
      const result = await action.getState(
        fakeRuntime,
        _.merge({}, fakeContractInfo, fakeCtx),
        {
          target: ['Woot'],
          func: 'something',
          args: ['split', { wave: 'form' }],
          value: '1234',
        },
        { ref: null, currentLabel: 'invoke.Invoke' }
      );

      expect(result).toContainEqual({
        to: [fakeContractInfo.contracts.Woot.address],
        func: 'something',
        args: ['"split"', '{"wave":"form"}'],
        value: '1234',
      });
    });
  });

  describe('getInputs()', () => {
    it('detects all usages', async () => {
      expect(
        action
          .getInputs(
            {
              target: ['a'],
              abi: '<%= contracts.b %>',
              from: '<%= contracts.c %>',
              func: '<%= contracts.d %>',
              value: '<%= contracts.e %>',
              factory: { whop: { event: '<%= contracts.f %>', arg: 0, artifact: '<%= contracts.g %>' } },
              args: ['<%= contracts.h %>', '<%= contracts.i %>'],
              overrides: { gasLimit: '<%= contracts.j %>' },
            },
            []
          )
          .accesses.sort()
      ).toEqual([
        'contracts.a',
        'contracts.b',
        'contracts.c',
        'contracts.d',
        'contracts.e',
        'contracts.f',
        'contracts.g',
        'contracts.h',
        'contracts.i',
        'contracts.j',
      ]);
    });
  });

  describe('getOutputs()', () => {
    it('returns the contract that is outputted', () => {
      expect(
        action.getOutputs(
          {
            target: 'hello',
            func: 'wohoo',
            factory: { something: { event: 'whoop', arg: 0 } },
            extra: { else: { event: 'arst', arg: 1 } },
          },
          { ref: new PackageReference('fun:1.0.0'), currentLabel: 'invoke.Hello' }
        )
      ).toEqual(['txns.Hello', 'contracts.something', 'something', 'settings.else', 'extras.else']);
    });
  });

  describe('exec()', () => {
    // TODO: reenable once I better understand transaction event parsing in viem
    it('works and parses all information from transaction result', async () => {
      jest.mocked(fakeRuntime.provider.simulateContract).mockResolvedValue({ request: {} } as any);
      jest.mocked(fakeRuntime.provider.waitForTransactionReceipt).mockResolvedValue({
        transactionHash: '0x1234',
        gasUsed: BigInt(0),
        effectiveGasPrice: 0,
        blockNumber: 0,
        from: '0x0987098709870987098709870987098709870978',
        logs: [
          {
            blockNumber: 0,
            blockHash: '0x',
            transactionIndex: 0,
            removed: false,
            address: fakeContractInfo.contracts.Woot.address,
            data: '0x00000000000000000000000012341234123412341234123412341234123412340000000000000000000000005678567856785678567856785678567856785678',

            topics: ['0x9b147922a677a436de7b494824cce084dbfaea7af985f77b90efbb838054176a'],

            transactionHash: '0x1234',
            logIndex: 0,
          },
          {
            blockNumber: 0,
            blockHash: '0x',
            transactionIndex: 0,
            removed: false,
            address: fakeContractInfo.contracts.Woot.address,
            data: '0x00000000000000000000000012341234123412341234123412341234123412340000000000000000000000006678567856785678567856785678567856785678',

            topics: ['0x5982b9f44b13456ee27cfabc93fb4d6bbc63639124ec74a6debe6595a2076420'],

            transactionHash: '0x1234',
            logIndex: 0,
          },
        ],
      } as any);

      jest.mocked(fakeRuntime.provider.getBlock).mockResolvedValue({
        timestamp: 0n,
      } as any);

      const result = await action.exec(
        fakeRuntime,
        _.merge({}, fakeContractInfo, fakeCtx),
        {
          target: ['Woot'],
          func: 'something',
          args: ['foo', { bar: 'baz' }, 'foobar'],
          factory: {
            Whoof: {
              event: 'SomethingHappened',
              arg: 1,
              abiOf: ['Woot', 'What'],
              constructorArgs: ['whoot'],
            },
            Whoofy: {
              event: 'SomethingElseHappened',
              arg: 1,
              abiOf: ['Woot', 'What'],
              constructorArgs: ['whoot'],
            },
          },
        },
        { ref: new PackageReference('fun:1.0.0'), currentLabel: 'invoke.something' }
      );

      expect(result.contracts).toStrictEqual({
        Whoof: {
          address: '0x5678567856785678567856785678567856785678',
          constructorArgs: ['whoot'],
          abi: fakeContractInfo.contracts.Woot.abi,
          contractName: '',
          deployTimestamp: '',
          deployTxnBlockNumber: '',
          deployTxnHash: '',
          deployedOn: 'invoke.something',
          sourceName: '',
          gasCost: '0',
          gasUsed: 0,
        },
        Whoofy: {
          address: '0x6678567856785678567856785678567856785678',
          constructorArgs: ['whoot'],
          abi: fakeContractInfo.contracts.Woot.abi,
          contractName: '',
          deployTimestamp: '',
          deployTxnBlockNumber: '',
          deployTxnHash: '',
          deployedOn: 'invoke.something',
          sourceName: '',
          gasCost: '0',
          gasUsed: 0,
        },
      });

      expect(result.txns!.something.events.SomethingHappened[0].args).toEqual([
        '0x1234123412341234123412341234123412341234',
        '0x5678567856785678567856785678567856785678',
      ]);
      expect(result.txns!.something.events.SomethingElseHappened[0].args).toEqual([
        '0x1234123412341234123412341234123412341234',
        '0x6678567856785678567856785678567856785678',
      ]);
      expect(result.txns!.something.hash).toEqual('0x1234');
      expect(result.txns!.something.deployedOn).toEqual('invoke.something');

      // try again if one of the events is unnamed in the api (changes how viem handles it)
    });
  });
});
