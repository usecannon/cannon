import { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InputState } from './utils';

interface BoolInputProps {
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

export const BoolInput: FC<BoolInputProps> = ({ handleUpdate, state }) => {
  const handleChange = (checked: boolean) => {
    handleUpdate({
      inputValue: checked.toString(),
      parsedValue: checked,
      error: undefined,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="bool-input"
        checked={state.parsedValue as boolean}
        onCheckedChange={handleChange}
      />
      <Label htmlFor="bool-input">{state.parsedValue ? 'True' : 'False'}</Label>
    </div>
  );
};
