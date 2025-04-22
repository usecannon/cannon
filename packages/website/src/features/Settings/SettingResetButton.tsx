import { Button } from '@/components/ui/button';
import React from 'react';

type SettingResetButtonProps = {
  onReset: () => void;
  sectionName: string;
};

const SettingResetButton: React.FC<SettingResetButtonProps> = ({
  onReset,
  sectionName,
}) => {
  return (
    <div className="flex justify-end">
      <Button
        variant="destructive"
        className="h-auto"
        onClick={(e) => {
          e.preventDefault();
          if (
            window.confirm(
              `Are you sure you want to reset to default settings for ${sectionName}? This can't be undone.`
            )
          ) {
            onReset();
            alert('Done!');
          }
        }}
      >
        Reset to defaults
      </Button>
    </div>
  );
};

export default SettingResetButton;
