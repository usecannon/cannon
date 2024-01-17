import { FC, useEffect, useState } from 'react';
import { Input } from '@chakra-ui/react';
import { stringToHex } from 'viem';
import { AbiParameter } from 'abitype';

export const DefaultInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
  inputType: AbiParameter['type'];
}> = ({ handleUpdate, value = '', inputType }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  useEffect(() => {
    const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
    if (inputType == 'bytes32' && !bytes32Regex.test(updateValue)) {
      handleUpdate(stringToHex(updateValue, { size: 32 }));
    } else if (inputType == 'tuple') {
      try {
        handleUpdate(JSON.parse(updateValue));
      } catch (err) {
        // ignore
      }
    } else {
      handleUpdate(updateValue || '');
    }
  }, [updateValue]);
  return (
    <Input
      type="text"
      size="sm"
      bg="black"
      borderColor="whiteAlpha.400"
      value={updateValue}
      onChange={(e) => setUpdateValue(e.target.value)}
    />
  );
};
