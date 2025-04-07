import { CONSOLE_LOG_ADDRESS, renderTraceEntry, renderResult, parseContractErrorReason, parseFunctionData } from './trace';
import * as viem from 'viem';

import chalk from 'chalk';

// disable chalk so we dont have to deal with confusion
chalk.level = 0;

describe('trace.ts', () => {
  describe('renderResult()', () => {
    it('renders objects as expected', () => {
      expect(renderResult(['wohoo', 1234, { wani: 'kani', swamp: ['world', { of: 'good' }] }])).toEqual(
        '("wohoo", "1234", {"wani":"kani","swamp":["world",{"of":"good"}]})'
      );
    });
  });

  describe('parseContractErrorReason()', () => {
    it('decodes solidity tx errors', () => {
      expect(
        parseContractErrorReason(null, (viem.toFunctionSelector('Panic(uint256)') + viem.zeroHash.slice(2)) as viem.Hex)
      ).toEqual('Panic("generic/unknown error")');
    });

    it('decodes contract errors', () => {
      expect(
        parseContractErrorReason(
          {
            address: viem.zeroAddress,
            abi: [
              {
                type: 'error',
                name: 'Hello',
                inputs: [{ type: 'uint256', name: 'world' }],
              },
            ],
          },
          (viem.toFunctionSelector('Hello(uint256)') + viem.zeroHash.slice(2)) as viem.Hex
        )
      ).toEqual('Hello("0")');
    });
  });

  describe('parseFunctionData()', () => {
    it('parses console log', () => {
      const functionData = parseFunctionData(
        {},
        CONSOLE_LOG_ADDRESS,
        ('0x' +
          (3054400204).toString(16) +
          viem.encodeAbiParameters([{ type: 'string' }, { type: 'uint256' }], ['woot', 1234n]).slice(2)) as viem.Hex,
        '0x'
      );

      expect(functionData.contractName).toEqual('console');
      expect(functionData.isReverted).toEqual(false);
      expect(functionData.parsedInput).toEqual('log("woot", "1234")');
      expect(functionData.parsedOutput).toEqual('');
    });

    it('parses contract call', () => {
      const testFunc: viem.Abi = [
        {
          type: 'function',
          name: 'testFunc',
          inputs: [{ type: 'string' }, { type: 'uint256' }],
          outputs: [{ type: 'bytes32' }],
          stateMutability: 'payable',
        },
        {
          type: 'error',
          name: 'FailureToDoAnything',
          inputs: [],
        },
      ];

      const functionData = parseFunctionData(
        {
          contracts: {
            FunTest: {
              address: viem.zeroAddress,
              abi: testFunc,
              deployTxnHash: viem.zeroHash,
              contractName: 'Fun',
              sourceName: 'Fun.sol',
              deployedOn: 'arst.arst',
              gasUsed: 1234,
              gasCost: '1234',
            },
          },
        },
        viem.zeroAddress,
        viem.encodeFunctionData({ abi: testFunc, functionName: 'testFunc', args: ['woot', 1234] }),
        viem.encodeFunctionResult({ abi: testFunc, functionName: 'testFunc', result: viem.zeroHash })
      );

      expect(functionData.contractName).toEqual('FunTest');
      expect(functionData.isReverted).toEqual(false);
      expect(functionData.parsedInput).toEqual('testFunc("woot", "1234")');
      expect(functionData.parsedOutput).toEqual(`("${viem.zeroHash}")`);

      // what about revert
      const errFunctionData = parseFunctionData(
        {
          contracts: {
            FunTest: {
              address: viem.zeroAddress,
              abi: testFunc,
              deployTxnHash: viem.zeroHash,
              contractName: 'Fun',
              sourceName: 'Fun.sol',
              deployedOn: 'arst.arst',
              gasUsed: 1234,
              gasCost: '1234',
            },
          },
        },
        viem.zeroAddress,
        viem.encodeFunctionData({ abi: testFunc, functionName: 'testFunc', args: ['woot', 1234] }),
        viem.encodeErrorResult({ abi: testFunc, errorName: 'FailureToDoAnything' })
      );

      expect(errFunctionData.contractName).toEqual('FunTest');
      expect(errFunctionData.isReverted).toEqual(true);
      expect(errFunctionData.parsedInput).toEqual('testFunc("woot", "1234")');
      expect(errFunctionData.parsedOutput).toContain('FailureToDoAnything()');
    });
  });

  describe('renderTraceEntry()', () => {
    it('renders call entry as expected', () => {
      const testFunc: viem.Abi = [
        {
          type: 'function',
          name: 'testFunc',
          inputs: [{ type: 'string' }, { type: 'uint256' }],
          outputs: [{ type: 'bytes32' }],
          stateMutability: 'payable',
        },
        {
          type: 'error',
          name: 'FailureToDoAnything',
          inputs: [],
        },
      ];

      const traceEntryString = renderTraceEntry(
        {
          contracts: {
            FunTest: {
              address: viem.zeroAddress,
              abi: testFunc,
              deployTxnHash: viem.zeroHash,
              contractName: 'Fun',
              sourceName: 'Fun.sol',
              deployedOn: 'arst.arst',
              gasUsed: 1234,
              gasCost: '1234',
            },
          },
        },
        {
          type: 'call',
          action: {
            callType: 'call',
            from: viem.zeroAddress,
            gas: '123402',
            input: viem.encodeFunctionData({ abi: testFunc, functionName: 'testFunc', args: ['woot', 1234] }),
            to: viem.zeroAddress,
            value: '1234',
          },
          blockHash: '',
          blockNumber: '',
          result: {
            gasUsed: '1234',
            code: '1',
            output: viem.encodeFunctionResult({ abi: testFunc, functionName: 'testFunc', result: viem.zeroHash }),
          },
          subtraces: 0,
          traceAddress: [5, 2],
          transactionHash: viem.zeroHash,
          transactionPosition: 0,
        }
      );

      expect(traceEntryString).toContain(
        `      CALL FunTest.testFunc("woot", "1234") => ("${viem.zeroHash}") (123,402 gas)`
      );
    });
  });
});
