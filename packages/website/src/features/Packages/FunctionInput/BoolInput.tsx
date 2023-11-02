import { Select } from '@chakra-ui/react';
import { FC, useEffect, useState } from 'react';

export const BoolInput: FC<{
  handleUpdate: (value: boolean) => void;
  value?: boolean;
}> = ({ handleUpdate, value = false }) => {
  const [updateValue, setUpdateValue] = useState<boolean>(value);
  useEffect(() => handleUpdate(updateValue), [updateValue]);

  return (
    <Select
      borderColor="whiteAlpha.400"
      bg="black"
      size="sm"
      onChange={(e) => setUpdateValue(e.target.value === 'true')}
    >
      <option value="false">False</option>
      <option value="true">True</option>
    </Select>
  );
};
