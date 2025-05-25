import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AddressInput } from './AddressInput';
import { BoolInput } from './BoolInput';
import { ByteInput } from './ByteInput';
import { DefaultInput } from './DefaultInput';
import { NumberInput } from './NumberInput';
import { JsonInput } from './JsonInput';
import { InputState } from './utils';
//import TupleInput from './TupleInput';

// Type guards for value assertions
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const isBigInt = (value: unknown): value is bigint => typeof value === 'bigint';
// const isObject = (value: unknown): value is Record<string, unknown> =>
//   typeof value === 'object' && value !== null;

interface AbiMethodInputProps {
  input: AbiParameter;
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

export const AbiContractMethodInputType: FC<AbiMethodInputProps> = ({
  input,
  handleUpdate,
  state,
}) => {
  switch (true) {
    // handle tuples in arrays
    case input.type.startsWith('tuple'):
      return (
        <JsonInput
          isTupleArray={input.type.includes('[]')}
          handleUpdate={handleUpdate}
          state={state}
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
      if (!isBoolean(state.parsedValue) && state.parsedValue !== undefined) {
        throw new Error(
          `Expected boolean for bool type, got ${typeof state.parsedValue}`
        );
      }
      return <BoolInput handleUpdate={handleUpdate} state={state} />;
    case input.type.startsWith('address'):
      if (
        !isString(state.parsedValue) &&
        !isStringArray(state.parsedValue) &&
        state.parsedValue !== undefined
      ) {
        throw new Error(
          `Expected string, string array or undefined for address type, got ${typeof state.parsedValue}`
        );
      }
      return <AddressInput handleUpdate={handleUpdate} state={state} />;
    case input.type.startsWith('int') || input.type.startsWith('uint'):
      if (!isBigInt(state.parsedValue) && state.parsedValue !== undefined) {
        throw new Error(
          `Expected bigint or undefined for number type, got ${typeof state.parsedValue}`
        );
      }
      return (
        <NumberInput handleUpdate={handleUpdate} state={state} showWeiValue />
      );
    case input.type.startsWith('bytes'): {
      if (
        !isString(state.parsedValue) &&
        !isStringArray(state.parsedValue) &&
        state.parsedValue !== undefined
      ) {
        throw new Error(
          `Expected string, string array or undefined for bytes type, got ${typeof state.parsedValue}`
        );
      }
      // Extract the number of bytes from the type string (e.g., 'bytes32' -> 32)
      const byteSize = parseInt(input.type.replace('bytes', ''));
      return (
        <ByteInput
          handleUpdate={handleUpdate}
          state={state}
          byte={isNaN(byteSize) ? undefined : byteSize}
        />
      );
    }
    default:
      if (
        !isString(state.parsedValue) &&
        !isStringArray(state.parsedValue) &&
        state.parsedValue !== undefined
      ) {
        throw new Error(
          `Expected string, string array or undefined for default type, got ${typeof state.parsedValue}`
        );
      }
      return <DefaultInput handleUpdate={handleUpdate} state={state} />;
  }
};
