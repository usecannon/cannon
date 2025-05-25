import { FC } from 'react';
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
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

export const JsonInput: FC<JsonInputProps> = ({
  handleUpdate,
  state,
  isTupleArray,
}) => {
  const _value = Array.isArray(state.inputValue)
    ? JSON.stringify(state.inputValue)
    : (state.inputValue as string);

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
          value={_value}
          onChange={(e) => {
            let newError = undefined;
            let parsedValue = undefined;
            try {
              parsedValue = JSON.parse(e.target.value);
            } catch (error) {
              newError = 'Invalid JSON format';
            }
            handleUpdate({
              inputValue: e.target.value,
              parsedValue,
              error: newError,
            });
          }}
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
