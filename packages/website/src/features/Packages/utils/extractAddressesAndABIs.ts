type ResultType = {
  [key: string]: {
    address: string;
    abi: any[];
  };
};

type ConfigObject = {
  [key: string]: any;
};

export function extractAddressesAbis(obj: ConfigObject, result: ResultType = {}): ResultType {
  for (const key in obj) {
    const value = obj[key];
    if (value && typeof value === 'object') {
      // Check if the current object has both address and abi keys and they meet expected types
      if ('address' in value && 'abi' in value && typeof value.address === 'string' && Array.isArray(value.abi)) {
        result[key] = {
          address: value.address,
          abi: value.abi,
        };
      }
      // Recursively search through nested objects
      extractAddressesAbis(value, result);
    }
  }
  return result;
}
