import { ChangeEvent, FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DefaultInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  error?: string;
}

export const DefaultInput: FC<DefaultInputProps> = ({
  handleUpdate,
  value,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleUpdate(value);
    setInputValue(value);
  };

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        className={cn(error && 'border-red-500')}
        data-testid="default-input"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
