//import React from 'react';
import { describe, it, expect } from 'vitest';
import * as viem from 'viem';
import { isEqual } from 'lodash';

import { parseAbiParameter } from './index';

describe('parseAbiParameter', () => {
  describe('array types', () => {
    it('should parse uint256[] type', () => {
      const values = ['1000000000000000000', '2000000000000000000'];
      const result = parseAbiParameter({ type: 'uint256[]' }, values);

      expect(result.rawValue).toEqual(values);
      expect(result.isTuple).toBe(true);
      expect(JSON.parse(result.parsedValue)).toEqual(values);
    });

    it('should parse string[] type', () => {
      const values = ['Hello', 'World'];
      const result = parseAbiParameter({ type: 'string[]' }, values);

      expect(result.rawValue).toEqual(values);
      expect(result.isTuple).toBe(true);
      expect(JSON.parse(result.parsedValue)).toEqual(values);
    });
  });

  describe('tuple[]', () => {
    const tupleArrayParameter: viem.AbiParameter = {
      type: 'tuple[]',
      components: [
        { type: 'address', name: 'facetAddress' },
        { type: 'bytes4[]', name: 'functionSelectors' },
      ],
    };

    const tupleArrayValue = [
      {
        facetAddress: '0xD732917866d0Cdc7E9eD8eF719C9f122EF71a61e',
        functionSelectors: ['0x79ba5097', '0x1bbacca3', '0x1fdef966'],
      },
      {
        facetAddress: '0xA20E40A57A241306762eA08a8560DDc81EeB4ae9',
        functionSelectors: ['0x268a2f01', '0x237f822a'],
      },
    ];

    it('should parse tuple array correctly', () => {
      const result = parseAbiParameter(tupleArrayParameter, tupleArrayValue);

      expect(isEqual(result.rawValue, tupleArrayValue)).toBe(true);
      expect(result.isTuple).toBe(true);
      expect(result.parsedValue).toBe(JSON.stringify(tupleArrayValue, null, 2));
    });

    it('should handle empty tuple array', () => {
      const result = parseAbiParameter(tupleArrayParameter);
      const emptyArray: any[] = [];

      expect(isEqual(result.rawValue, emptyArray)).toBe(true);
      expect(result.isTuple).toBe(true);
      expect(result.parsedValue).toBe('[]');
    });
  });

  describe('basic types non empty', () => {
    it('should parse address type', () => {
      const address = '0xD732917866d0Cdc7E9eD8eF719C9f122EF71a61e';
      const result = parseAbiParameter({ type: 'address' }, address);

      expect(result.rawValue).toBe(address);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(address);
    });

    it('should parse uint256 type with valid number', () => {
      const value = '1000000000000000000';
      const result = parseAbiParameter({ type: 'uint256' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(value);
    });

    it('should parse int256 type', () => {
      const value = '1000000000000000000';
      const result = parseAbiParameter({ type: 'int256' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(value);
    });

    it('should parse bool type', () => {
      const result = parseAbiParameter({ type: 'bool' }, true);

      expect(result.rawValue).toBe(true);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('true');
    });

    it('should parse string type', () => {
      const value = 'Hello World';
      const result = parseAbiParameter({ type: 'string' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(value);
    });

    it('should parse bytes type', () => {
      const value = '0x1234';
      const result = parseAbiParameter({ type: 'bytes' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(value);
    });

    it('should parse fixed bytes type', () => {
      const value = '0x1234567890';
      const result = parseAbiParameter({ type: 'bytes4' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(value);
    });

    it('should handle invalid BigInt conversion', () => {
      const value = 'invalid';
      const result = parseAbiParameter({ type: 'uint256' }, value);

      expect(result.rawValue).toBe(value);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('Cannot parse rpc response for uint256 with value invalid');
    });
  });

  describe('basic types empty values', () => {
    it('should handle empty address', () => {
      const result = parseAbiParameter({ type: 'address' });
      expect(result.rawValue).toBe(viem.zeroAddress);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe(viem.zeroAddress);
    });

    it('should handle empty uint256', () => {
      const result = parseAbiParameter({ type: 'uint256' });
      expect(result.rawValue).toBe('0');
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('0');
    });

    it('should handle empty bool', () => {
      const result = parseAbiParameter({ type: 'bool' });
      expect(result.rawValue).toBe(false);
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('false');
    });

    it('should handle empty string', () => {
      const result = parseAbiParameter({ type: 'string' });
      expect(result.rawValue).toBe('');
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('');
    });

    it('should handle empty bytes', () => {
      const result = parseAbiParameter({ type: 'bytes' });
      expect(result.rawValue).toBe('0x');
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('0x');
    });

    it('should handle empty fixed bytes', () => {
      const result = parseAbiParameter({ type: 'bytes4' });
      expect(result.rawValue).toBe('0x00000000');
      expect(result.isTuple).toBe(false);
      expect(result.parsedValue).toBe('0x00000000');
    });
  });
});
