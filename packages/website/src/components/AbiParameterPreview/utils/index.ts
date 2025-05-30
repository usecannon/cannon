import * as viem from 'viem';
import { isObject, isNil, isPlainObject } from 'lodash';

// Type guards
function _hasComponentsKey(
  item: viem.AbiParameter
): item is viem.AbiParameter & { components: readonly viem.AbiParameter[] } {
  return isObject(item) && 'components' in item && Array.isArray(item.components);
}

function _isNumberType(type: string): boolean {
  if (typeof type !== 'string') {
    throw new Error(`Invalid type given to assert "${type}"`);
  }
  return /^(uint|int|fixed|ufixed)\d{0,}$/.test(type);
}

// Value conversion utilities
function _convertToNumberString(val: unknown): string {
  if (typeof val === 'string' && /^[\d.,]+$/.test(val)) {
    return val;
  } else if (typeof val === 'number' || typeof val === 'bigint') {
    return val.toString();
  }
  throw Error(`Invalid number value: ${val}`);
}

function _formatBytesValue(val: unknown): string {
  if (typeof val !== 'string') {
    return val?.toString() || '';
  }

  // If it's already a hex string, return it as is
  if (viem.isHex(val)) {
    return val;
  }

  // For empty bytes, return '0x'
  if (val === '') {
    return '0x';
  }

  // For fixed bytes, ensure proper padding
  if (val.startsWith('0x')) {
    const size = val.length - 2; // Remove '0x' prefix
    return viem.padHex(val as viem.Hex, { size });
  }

  return val;
}

// Array and tuple handling
function _handleArrayValue(type: string, val: unknown, valueParser: (type: string, val: unknown) => string): string {
  if (!Array.isArray(val)) {
    throw Error(`Invalid array value for type "${type}": ${val}`);
  }
  const baseType = type.slice(0, -2);
  const results = val.map((v) => valueParser(baseType, v));
  const isTuple = baseType.startsWith('tuple');

  if (isTuple) {
    return JSON.stringify(val, null, 2);
  }

  return JSON.stringify(results, null, 2);
}

function _handleTupleValue(val: unknown): string {
  if (!isPlainObject(val)) {
    throw Error(`Invalid tuple value: ${val}`);
  }
  return JSON.stringify(val, null, 2);
}

// Value rendering
function _renderEmptyValue(abiParameter: viem.AbiParameter) {
  const { type } = abiParameter;

  const emptyValues: Record<string, unknown> = {
    '[]': [],
    number: '0',
    bool: false,
    address: viem.zeroAddress,
    function: viem.zeroAddress,
    bytes: '0x',
    string: '',
    tuple: _renderEmptyTuple(abiParameter),
  };

  if (type.endsWith('[]')) return emptyValues['[]'];
  if (_isNumberType(type)) return emptyValues.number;
  if (type.startsWith('bool')) return emptyValues.bool;
  if (type === 'address' || type === 'function') return emptyValues[type];
  if (type === 'bytes') return emptyValues.bytes;
  if (type.startsWith('bytes')) {
    const size = Number(type.slice(5)) * 2 || 0;
    return `0x${Array.from({ length: size }, () => '0').join('')}`;
  }
  if (type.startsWith('string')) return emptyValues.string;
  if (type === 'tuple') return emptyValues.tuple;

  return '(no result)';
}

function _renderEmptyTuple(abiParameter: viem.AbiParameter): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (_hasComponentsKey(abiParameter)) {
    for (const component of abiParameter.components) {
      if (typeof component.name === 'string' && component.name) {
        result[component.name] = _renderEmptyValue(component);
      }
    }
  }
  return result;
}

// Value parsing
function _parseArgumentValue(type: string, val: unknown): string {
  if (type.endsWith('[][]')) {
    return JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
  }

  if (type.endsWith('[]')) {
    return _handleArrayValue(type, val, _parseArgumentValue);
  }

  if (type.startsWith('bytes')) {
    return _formatBytesValue(val);
  }

  if (type === 'tuple') {
    return _handleTupleValue(val);
  }

  if (type === 'bool') {
    return val ? 'true' : 'false';
  }

  if (_isNumberType(type)) {
    return _convertToNumberString(val);
  }

  try {
    return (val as any).toString();
  } catch (e) {
    throw new Error(`Invalid arg value for "${type}": ${val}`);
  }
}

function _parseArgumentValueTooltip(type: string, val: unknown): string {
  if (type.endsWith('[][]')) {
    return '';
  }

  if (type.endsWith('[]')) {
    return _handleArrayValue(type, val, _parseArgumentValueTooltip);
  }

  if (type.startsWith('bytes')) {
    if (typeof val !== 'string' || !viem.isHex(val)) {
      throw Error(`Invalid bytes value: ${val}`);
    }
    return val === _parseArgumentValue(type, val) ? '' : val;
  }

  if (type === 'tuple') {
    const tupleValue = _handleTupleValue(val);
    return tupleValue === _parseArgumentValue(type, val) ? '' : tupleValue;
  }

  if (type === 'bool') {
    const boolValue = val ? 'true' : 'false';
    return boolValue === _parseArgumentValue(type, val) ? '' : boolValue;
  }

  if (_isNumberType(type)) {
    if (!val) return '';
    try {
      const etherValue = viem.formatEther(BigInt(_convertToNumberString(val)));
      return etherValue === _parseArgumentValue(type, val) ? '' : `${etherValue} assuming 18 decimal places`;
    } catch (e) {
      return '';
    }
  }

  return '';
}

// Public API
export function isAbiParameterArray(
  value: viem.AbiParameter | readonly viem.AbiParameter[]
): value is readonly viem.AbiParameter[] {
  return Array.isArray(value);
}

export function parseAbiParameter(abiParameter: viem.AbiParameter, value?: unknown) {
  const { type } = abiParameter;
  const rawValue = isNil(value) ? _renderEmptyValue(abiParameter) : value;
  const isTupleArray = type.endsWith('[][]');
  const isTuple = !isTupleArray && (type.endsWith('[]') || type === 'tuple');

  try {
    return {
      rawValue,
      isTupleArray,
      isTuple,
      tooltipText: _parseArgumentValueTooltip(type, rawValue),
      parsedValue: _parseArgumentValue(type, rawValue),
    };
  } catch (e) {
    return {
      rawValue,
      isTupleArray,
      isTuple,
      tooltipText: '',
      parsedValue: `Cannot parse rpc response for ${type} with value ${value}`,
    };
  }
}
