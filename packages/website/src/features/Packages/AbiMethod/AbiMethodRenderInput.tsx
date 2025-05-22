import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AddressInput } from './AddressInput';
import { BoolInput } from './BoolInput';
import { ByteInput } from './ByteInput';
import { DefaultInput } from './DefaultInput';
import { NumberInput } from './NumberInput';
import { JsonInput } from './JsonInput';
import TupleInput from './TupleInput';

// Type guards for value assertions
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
const isString = (value: unknown): value is string => typeof value === 'string';
const isBigInt = (value: unknown): value is bigint => typeof value === 'bigint';
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface AbiMethodInputProps {
  input: AbiParameter;
  handleUpdate: (value: any, error?: string) => void;
  value: unknown;
}

export const AbiMethodRenderInput: FC<AbiMethodInputProps> = ({
  input,
  handleUpdate,
  value,
}) => {
  switch (true) {
    // handle tuples in arrays
    case input.type.startsWith('tuple') && input.type.includes('[]'):
      return (
        <JsonInput
          handleUpdate={(value) => {
            try {
              JSON.stringify(value);
              handleUpdate(value);
            } catch (error) {
              handleUpdate(value, 'Invalid JSON format');
            }
          }}
          value={JSON.stringify(value)}
        />
      );
    // handle tuples, but not tuples in arrays
    case input.type.startsWith('tuple') && !input.type.includes('[]'):
      if (!isObject(value)) {
        throw new Error(`Expected object for tuple type, got ${typeof value}`);
      }
      return (
        <TupleInput input={input} handleUpdate={handleUpdate} value={value} />
      );
    case input.type.startsWith('bool'):
      if (!isBoolean(value)) {
        throw new Error(`Expected boolean for bool type, got ${typeof value}`);
      }
      return <BoolInput handleUpdate={handleUpdate} value={value} />;
    case input.type.startsWith('address'):
      if (!isString(value) && value !== undefined) {
        throw new Error(
          `Expected string or undefined for address type, got ${typeof value}`
        );
      }
      return <AddressInput handleUpdate={handleUpdate} value={value} />;
    case input.type.startsWith('int') || input.type.startsWith('uint'):
      if (!isBigInt(value) && value !== undefined) {
        throw new Error(
          `Expected bigint or undefined for number type, got ${typeof value}`
        );
      }
      return (
        <NumberInput handleUpdate={handleUpdate} value={value} showWeiValue />
      );
    case input.type.startsWith('bytes'): {
      if (!isString(value) && value !== undefined) {
        throw new Error(
          `Expected string or undefined for bytes type, got ${typeof value}`
        );
      }
      // Extract the number of bytes from the type string (e.g., 'bytes32' -> 32)
      const byteSize = parseInt(input.type.replace('bytes', ''));
      if (!byteSize) {
        throw new Error('Invalid byte size');
      }
      return (
        <ByteInput handleUpdate={handleUpdate} value={value} byte={byteSize} />
      );
    }
    default:
      if (!isString(value) && value !== undefined) {
        throw new Error(
          `Expected string or undefined for default type, got ${typeof value}`
        );
      }
      return <DefaultInput handleUpdate={handleUpdate} value={value} />;
  }
};
