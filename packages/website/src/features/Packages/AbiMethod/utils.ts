import { AbiFunction, AbiParameter } from 'abitype';
import { useState } from 'react';
export interface InputState {
  inputValue: string; // the value used to display in the input
  // parsedValue: any; // if the input value is correct, we use this attribute to store the parsed value, for example a BigInt(inputValue).
  error?: string;
}

// Given an array type, return the base type
export const getBaseType = (input: AbiParameter) => {
  const typeString = input.type.toLowerCase();
  if (!typeString.endsWith('[]')) {
    return input;
  }
  const baseType = typeString.replace(/\[.*\]$/, '');
  return {
    type: baseType,
    name: input.name,
    internalType: baseType,
  } as AbiParameter;
};

// Helper function to get default values for Solidity types
export const getDefaultValue = (input: AbiParameter): any => {
  const typeString = input.type.toLowerCase();

  // Tuple arrays (e.g., tuple[])
  // if (type.startsWith('tuple') && type.endsWith('[]')) {
  //   return [];
  // }

  if (typeString.endsWith('[][]')) {
    return undefined;
  }

  // Dynamic arrays (e.g., uint256[], string[])
  if (typeString.endsWith('[]') && !typeString.startsWith('tuple')) {
    return [];
  }

  // Fixed-size arrays (e.g., uint256[2], string[3])
  const fixedArrayMatch = typeString.match(/^(.*)\\[(\\d+)\\]$/);
  if (fixedArrayMatch && !typeString.startsWith('tuple')) {
    const baseType = fixedArrayMatch[1]; // e.g., "uint256"
    const size = parseInt(fixedArrayMatch[2]);
    if (size > 0) {
      // Create an array of 'size' elements, each initialized by getDefaultValue(baseType)
      return Array(size)
        .fill(null)
        .map(() => getDefaultValue({ type: baseType, name: '_arrayElement' } as AbiParameter));
    }
    return [];
  }

  // const components =
  //   'components' in input && Array.isArray(input.components)
  //     ? (input as AbiParameter & { components: readonly AbiParameter[] }).components
  //     : undefined;

  // Handle tuples
  // if (typeString.startsWith('tuple') && !typeString.endsWith('[]') && components) {
  //   const tupleObject: Record<string, any> = {};
  //   for (const component of components) {
  //     if (component.name) {
  //       // Recursive call, passing the full component AbiParameter
  //       tupleObject[component.name] = getDefaultValue(component);
  //     }
  //     // TODO: Consider how to handle tuple components without names if that's a valid case
  //   }
  //   return tupleObject;
  // }

  // Handle literal tuple string representation (e.g., "(uint256,address)")
  // This part might become less relevant if all inputs are proper AbiParameter objects,
  // but can be kept for robustness if such string types can still appear.
  // However, to strictly adhere to input: AbiParameter, this section would ideally be
  // removed or handled by the caller constructing an AbiParameter first.
  // For now, we'll adapt it to create AbiParameter objects for the recursive call.
  if (typeString.startsWith('(') && typeString.endsWith(')')) {
    const innerTypes = typeString
      .slice(1, -1)
      .split(',')
      .map((t) => t.trim());
    // This returns an array of default values.
    return innerTypes.map((innerType) => getDefaultValue({ type: innerType, name: '_innerElement' } as AbiParameter));
  }

  // const _typeString = typeString.includes('tuple') ? (typeString.endsWith('[]') ? 'tupleArray' : 'tuple') : typeString;

  // 3. Handle basic types
  switch (typeString) {
    case 'bool':
      return false;
    case 'address':
      return ''; // Default empty address
    case 'string':
      return '';
    case 'tuple':
      return undefined;
    default:
      // bytesN (fixed size)
      if (typeString.startsWith('bytes')) {
        return '';
      }
      if (typeString.startsWith('int') || typeString.startsWith('uint')) {
        return undefined;
      }
      return null;
  }
};

export const useInitMethodParams = (inputs: AbiFunction['inputs']) => {
  const [params, setParams] = useState<any[]>(() => {
    return inputs.map(getDefaultValue);
  });

  return [params, setParams] as const;
};

/**
 * Extracts the final values from an array of InputState objects, handling both single values and arrays
 * @param params Array of InputState objects
 * @returns Array of final values, with nested arrays properly handled
 */
// export const extractParamValues = (params: InputState[]): any[] => {
//   return params.map((p) => {
//     // arrays and tuples assign to parsedValue and array.
//     // only inputType of type array save an InputStates on each element of the array.
//     // tuples arrays save raw values.
//     if (Array.isArray(p.parsedValue) && p.parsedValue[0]?.parsedValue) {
//       return p.parsedValue.map((item) => item.parsedValue);
//     }
//     return p.parsedValue;
//   });
// };
