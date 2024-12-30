import { FC, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

export const DefaultInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
}> = ({ handleUpdate, value = '' }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  useEffect(() => {
    handleUpdate(updateValue || '');
  }, [updateValue]);
  return (
    <Input
      type="text"
      className="bg-background border-input"
      value={updateValue}
      onChange={(e) => setUpdateValue(e.target.value)}
    />
  );
};
