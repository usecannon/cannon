import { AbiFunction } from 'abitype';
import { useState } from 'react';
// import { toBytes, pad } from 'viem/utils';

// Helper function to get default values for Solidity types
export const getDefaultValue = (type: string): any => {
  // Handle tuples (e.g., (uint256,address))
  if (type.startsWith('(') && type.endsWith(')')) {
    // Extract inner types and create a tuple with default values
    const innerTypes = type
      .slice(1, -1)
      .split(',')
      .map((t) => t.trim());
    return innerTypes.map((innerType) => getDefaultValue(innerType));
  }

  switch (type) {
    case 'bool':
      return false;
    case 'address':
      return '';
    case 'string':
      return '';
    default:
      if (type.startsWith('bytes')) {
        return '';
      }

      if (type.startsWith('int') || type.startsWith('uint')) {
        return BigInt(0);
      }

      // Handle fixed-size bytes (bytes1 to bytes32)
      //   if (type.startsWith('bytes') && !isNaN(parseInt(type.slice(5)))) {
      //     const size = parseInt(type.slice(5));
      //     return pad(toBytes('0x'), { size }).toString();
      //   }
      return null;
  }
};

// Hook to initialize and manage method arguments based on Solidity data types
export const useMethodArgs = (inputs: AbiFunction['inputs']) => {
  const [params, setParams] = useState<any[]>(() => {
    // Initialize each input with its default value based on type
    return inputs.map((input) => {
      const type = input.type.toLowerCase();

      // Handle arrays
      if (type.includes('[]')) {
        return [];
      }

      // Handle fixed-size arrays
      if (type.includes('[') && type.includes(']')) {
        const size = parseInt(type.match(/\[(\d+)\]/)?.[1] || '0');
        return Array(size).fill(getDefaultValue(type.replace(/\[\d+\]/, '')));
      }

      // Handle mappings
      if (type.startsWith('mapping')) {
        return {};
      }

      return getDefaultValue(type);
    });
  });

  return [params, setParams] as const;
};
