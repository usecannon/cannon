import { FC } from 'react';
import { Input } from '@/components/ui/input';

type DefaultInputProps = {
  handleUpdate: (value: string) => void;
  value?: string;
};

export const DefaultInput: FC<DefaultInputProps> = ({
  handleUpdate,
  value = '',
}) => {
  return (
    <Input
      type="text"
      className="bg-background border-input"
      value={value}
      onChange={(e) => handleUpdate(e.target.value)}
      data-testid="default-input"
    />
  );
};
