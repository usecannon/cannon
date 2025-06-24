import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AddressInput } from './AddressInput';
import { BoolInput } from './BoolInput';
import { ByteInput } from './ByteInput';
import { DefaultInput } from './DefaultInput';
import { NumberInput } from './NumberInput';
import { JsonInput } from './JsonInput';
//import TupleInput from './TupleInput';

// Type guards for value assertions
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const isBigInt = (value: unknown): value is bigint => {
  if (typeof value == 'string') {
    try {
      BigInt(value);
      return true;
    } catch (e) {
      return false;
    }
  } else {
    return typeof value === 'bigint';
  }
};
// const isObject = (value: unknown): value is Record<string, unknown> =>
//   typeof value === 'object' && value !== null;

interface AbiMethodInputProps {
  input: AbiParameter;
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  error?: string;
}

export const AbiContractMethodInputType: FC<AbiMethodInputProps> = ({
  input,
  handleUpdate,
  value,
  error,
}) => {
  switch (true) {
    case input.type.endsWith('[][]'):
      return (
        <JsonInput
          isTupleArray={true}
          handleUpdate={handleUpdate}
          value={value}
        />
      );
    // handle tuples in arrays
    case input.type.startsWith('tuple'):
      return (
        <JsonInput
          isTupleArray={input.type.includes('[]')}
          handleUpdate={handleUpdate}
          value={value}
        />
      );
    // handle tuples, but not tuples in arrays
    // case input.type.startsWith('tuple') && !input.type.includes('[]'):
    //   if (!isObject(value)) {
    //     throw new Error(`Expected object for tuple type, got ${typeof value}`);
    //   }
    //   return (
    //     <TupleInput input={input} handleUpdate={handleUpdate} value={value} />
    //   );
    case input.type.startsWith('bool'):
      if (!isBoolean(value) && value !== undefined) {
        throw new Error(`Expected boolean for bool type, got ${typeof value}`);
      }
      return <BoolInput handleUpdate={handleUpdate} value={value} />;
    case input.type.startsWith('address'):
      if (!isString(value) && !isStringArray(value) && value !== undefined) {
        throw new Error(
          `Expected string, string array or undefined for address type, got ${typeof value}`
        );
      }
      return (
        <AddressInput handleUpdate={handleUpdate} value={value} error={error} />
      );
    case input.type.startsWith('int') || input.type.startsWith('uint'):
      if (!isBigInt(value) && value !== undefined) {
        throw new Error(
          `Expected bigint or undefined for number type, got ${typeof value}`
        );
      }
      return (
        <NumberInput
          handleUpdate={handleUpdate}
          value={value}
          error={error}
          showWeiValue
        />
      );
    case input.type.startsWith('bytes'): {
      if (!isString(value) && value !== undefined) {
        throw new Error(
          `Expected string or undefined for bytes type, got ${typeof value}`
        );
      }
      // Extract the number of bytes from the type string (e.g., 'bytes32' -> 32)
      const byteSize = parseInt(input.type.replace('bytes', ''));
      return (
        <ByteInput
          handleUpdate={handleUpdate}
          value={value}
          error={error}
          byte={isNaN(byteSize) ? undefined : byteSize}
        />
      );
    }
    default:
      if (!isString(value) && !isStringArray(value) && value !== undefined) {
        throw new Error(
          `Expected string, string array or undefined for default type, got ${typeof value}`
        );
      }
      return (
        <DefaultInput handleUpdate={handleUpdate} value={value} error={error} />
      );
  }
};
