import { FC, useEffect, useState } from 'react';
import { Input } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';

export const DefaultInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
  inputType: AbiParameter['type'];
}> = ({ handleUpdate, value = '', inputType }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  useEffect(() => {
    handleUpdate(updateValue || '');
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
