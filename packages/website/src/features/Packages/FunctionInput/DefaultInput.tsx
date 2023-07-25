import { FC, useEffect, useState } from 'react';
import { Input } from '@chakra-ui/react';
import { stringToHex } from 'viem';

export const DefaultInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
  inputType: string;
}> = ({ handleUpdate, value = '', inputType }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  useEffect(() => {
    const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
    if (inputType == 'bytes32' && !bytes32Regex.test(updateValue)) {
      handleUpdate(stringToHex(updateValue, { size: 32 }));
    } else {
      handleUpdate(updateValue || '');
    }
  }, [updateValue]);
  return (
    <Input
      type="text"
      bg="black"
      borderColor="whiteAlpha.400"
      value={value}
      onChange={(e) => setUpdateValue(e.target.value)}
    />
  );
};
