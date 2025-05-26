import { ChangeEvent, FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { InputState } from './utils';

interface DefaultInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
}

export const DefaultInput: FC<DefaultInputProps> = ({
  handleUpdate,
  value,
}) => {
  const [state, setInputState] = useState<InputState>({
    inputValue: value || '',
    error: undefined,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleUpdate(value);
    setInputState({
      inputValue: value,
      error: undefined,
    });
  };

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={state.inputValue as string}
        onChange={handleChange}
        className={cn(state.error && 'border-red-500')}
      />
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
    </div>
  );
};
