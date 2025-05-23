import { FC, useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const BoolInput: FC<{
  handleUpdate: (value: boolean) => void;
  value?: boolean;
}> = ({ handleUpdate, value = false }) => {
  const [updateValue, setUpdateValue] = useState<boolean>(value);
  useEffect(() => handleUpdate(updateValue), [updateValue]);

  return (
    <Select
      defaultValue={updateValue ? 'true' : 'false'}
      onValueChange={(value) => setUpdateValue(value === 'true')}
    >
      <SelectTrigger
        className="bg-background border-input"
        data-testid="bool-button"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="false" data-testid="bool-false-input">
          False
        </SelectItem>
        <SelectItem value="true" data-testid="bool-true-input">
          True
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
