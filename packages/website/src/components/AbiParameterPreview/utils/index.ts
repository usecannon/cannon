import * as viem from 'viem';
import { isObject, isNil, isPlainObject } from 'lodash';

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

function _getNumberString(val: unknown): string {
  if (typeof val === 'string' && /^[\d.,]+$/.test(val)) {
    return val;
  } else if (typeof val === 'number') {
    return val.toString();
  } else if (typeof val === 'bigint') {
    return val.toString();
  }

  throw Error(`Invalid arg number value: ${val}`);
}

function _renderEmptyValue(abiParameter: viem.AbiParameter) {
  const { type } = abiParameter;

  if (type.endsWith('[]')) {
    return [];
  } else if (_isNumberType(type)) {
    return '0';
  } else if (type.startsWith('bool')) {
    return false;
  } else if (type === 'address' || type === 'function') {
    return viem.zeroAddress.toString();
  } else if (type === 'bytes') {
    return '0x';
  } else if (type.startsWith('bytes')) {
    const size = Number(type.slice(5)) * 2 || 0;
    const bytes = Array.from({ length: size }, () => '0');
    return `0x${bytes.join('')}`;
  } else if (type.startsWith('string')) {
    return '';
  } else if (type === 'tuple') {
    const result: { [key: string]: unknown } = {};

    if (_hasComponentsKey(abiParameter)) {
      for (const component of abiParameter.components) {
        if (typeof component.name === 'string' && component.name) {
          result[component.name] = _renderEmptyValue(component);
        }
      }
    }

    return result;
  } else {
    return '(no result)';
  }
}

function _parseArgumentValue(type: string, val: unknown): string {
  if (type.endsWith('[][]')) {
    return JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
  }

  if (type.endsWith('[]')) {
    const values = Array.isArray(val) ? val : [val];
    const results = values.map((v) => _parseArgumentValue(type.slice(0, -2), v));

    const isTuple = type.startsWith('tuple');
    return JSON.stringify(
      results.map((v) => (isTuple ? JSON.parse(v) : v)),
      (_, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
  }

  if (type.startsWith('bytes')) {
    try {
      const b = viem.hexToBytes(val as viem.Hex);
      const t = b.findIndex((v) => v < 0x20);
      if (b[t] != 0 || b.slice(t).find((v) => v != 0) || t === 0) {
        // this doesn't look like a terminated ascii hex string. leave it as hex
        return val?.toString() || '';
      }

      return viem.bytesToString(viem.trim(b, { dir: 'right' }));
    } catch (e) {
      return val?.toString() || '';
    }
  }

  if (type == 'tuple') {
    // TODO: use a lib?
    return JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
  }

  if (type == 'bool') {
    return val ? 'true' : 'false';
  }

  if (_isNumberType(type)) {
    return _getNumberString(val);
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
    if (!Array.isArray(val)) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    const arrayTooltip = `["${val.map((v) => _parseArgumentValueTooltip(type.slice(0, -2), v)).join('", "')}"]`;
    return arrayTooltip === _parseArgumentValue(type, val) ? '' : arrayTooltip;
  }

  if (type.startsWith('bytes')) {
    if (typeof val !== 'string' || !val.startsWith('0x')) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    const bytesTooltip = val.toString();
    return bytesTooltip === _parseArgumentValue(type, val) ? '' : bytesTooltip;
  }

  if (type == 'tuple') {
    if (!isPlainObject(val)) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    const tupleTooltip = JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    return tupleTooltip === _parseArgumentValue(type, val) ? '' : tupleTooltip;
  }

  if (type == 'bool') {
    const boolTooltip = val ? 'true' : 'false';
    return boolTooltip === _parseArgumentValue(type, val) ? '' : boolTooltip;
  }

  if (_isNumberType(type)) {
    if (!val) return '';
    const etherValue = `${viem.formatEther(BigInt(_getNumberString(val)))} assuming 18 decimal places`;
    return etherValue === _parseArgumentValue(type, val) ? '' : etherValue;
  }

  return '';
}

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
