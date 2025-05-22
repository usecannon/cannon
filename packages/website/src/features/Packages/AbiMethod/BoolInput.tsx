import { FC } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type BoolInputProps = {
  handleUpdate: (value: boolean) => void;
  value: boolean;
};

export const BoolInput: FC<BoolInputProps> = ({ handleUpdate, value }) => {
  return (
    <Select
      defaultValue={value ? 'true' : 'false'}
      onValueChange={(value) => handleUpdate(value === 'true')}
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
