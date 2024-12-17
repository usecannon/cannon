import { FC, useEffect, useMemo, useState } from 'react';
import { Input } from '@chakra-ui/react';
import { stringToHex } from 'viem';

export const ByteInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
  byte?: number;
}> = ({ handleUpdate, value = '', byte = 32 }) => {
  const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
  const [updateValue, setUpdateValue] = useState<string>(value);
  const isInvalid = useMemo(() => {
    // console.log(
    //   'length : ' + updateValue?.length + ', updateValue ; ' + updateValue
    // );
    if (updateValue.startsWith('0x')) {
      return updateValue?.length > 0 && !bytes32Regex.test(updateValue);
    } else {
      return updateValue?.length > 0 && updateValue?.length > byte;
    }
  }, [updateValue]);
  useEffect(() => {
    if (!bytes32Regex.test(updateValue)) {
      if (updateValue.startsWith('0x')) {
        handleUpdate(updateValue);
      } else {
        handleUpdate(stringToHex(updateValue.slice(0, byte), { size: 32 }));
      }
    } else {
      handleUpdate(updateValue || '');
    }
  }, [updateValue]);

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
