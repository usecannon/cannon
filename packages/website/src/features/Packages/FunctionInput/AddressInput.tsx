import { isAddress } from 'viem';
import { Input } from '@chakra-ui/react';
import { FC, useEffect, useMemo, useState } from 'react';

// This function is used to check if the value is an address or an array of addresses
const isValidArrayOrAddress = (value: any | any[]): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => isValidArrayOrAddress(v));
  }
  return isAddress(value);
};

export const AddressInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
}> = ({ handleUpdate, value = '' }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  const isInvalid = useMemo(() => {
    return updateValue?.length > 0 && !isValidArrayOrAddress(updateValue);
  }, [updateValue]);
  useEffect(() => handleUpdate(updateValue), [updateValue]);

  return (
    <Input
      type="text"
      bg="black"
      borderColor={isInvalid ? 'red.500' : 'whiteAlpha.400'}
      placeholder="0x0000000000000000000000000000000000000000"
      value={updateValue}
      size="sm"
      onChange={(e) => {
        setUpdateValue(e.target.value || '');
      }}
      _focus={{
        borderColor: isInvalid ? 'red.500' : 'blue.300',
      }}
    />
  );
};
