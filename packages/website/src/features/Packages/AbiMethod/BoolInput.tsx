import { FC, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InputState } from './utils';

interface BoolInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
}

export const BoolInput: FC<BoolInputProps> = ({ handleUpdate, value }) => {
  const [state, setInputState] = useState<InputState>({
    inputValue: value?.toString() || 'false',
    error: undefined,
  });

  const handleChange = (checked: boolean) => {
    handleUpdate(checked);
    setInputState({
      inputValue: checked.toString(),
      error: undefined,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        data-testid="bool-input"
        checked={state.inputValue === 'true'}
        onCheckedChange={handleChange}
      />
      <Label htmlFor="bool-input">
        {state.inputValue === 'true' ? 'True' : 'False'}
      </Label>
    </div>
  );
};
