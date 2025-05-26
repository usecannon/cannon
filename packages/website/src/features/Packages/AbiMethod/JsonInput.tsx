import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { InputState } from './utils';

interface JsonInputProps {
  isTupleArray: boolean;
  handleUpdate: (value: any, error?: string) => void;
  value: any;
}

export const JsonInput: FC<JsonInputProps> = ({
  handleUpdate,
  value,
  isTupleArray,
}) => {
  const [state, setInputState] = useState<InputState>({
    inputValue: Array.isArray(value) ? JSON.stringify(value) : value || '',
    error: undefined,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      handleUpdate(undefined);
      setInputState({
        inputValue: '',
        error: undefined,
      });
      return;
    }

    try {
      const parsedValue = JSON.parse(inputValue);
      handleUpdate(parsedValue);
      setInputState({
        inputValue,
        error: undefined,
      });
    } catch (error) {
      handleUpdate(undefined, 'Invalid JSON format');
      setInputState({
        inputValue,
        error: 'Invalid JSON format',
      });
    }
  };

  return (
    <Tooltip open={!!state.error}>
      <TooltipTrigger asChild>
        <Input
          type="text"
          className={cn(
            'bg-background',
            state.error
              ? 'border-destructive focus:border-destructive focus-visible:ring-destructive'
              : 'border-input'
          )}
          placeholder={isTupleArray ? '[[v1, v2], [v3, v4]]' : '[v1, v2]'}
          value={state.inputValue as string}
          onChange={handleChange}
          data-testid="json-input"
        />
      </TooltipTrigger>
      {state.error && (
        <TooltipContent side="top" className="max-w-sm text-center">
          <p className="break-words">{state.error}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
