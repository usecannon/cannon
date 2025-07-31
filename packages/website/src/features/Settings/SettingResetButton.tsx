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
    <Button
      variant="destructive"
      className="h-auto"
      onClick={(e) => {
        e.preventDefault();
        const message =
          sectionName === 'all'
            ? 'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
            : `Are you sure you want to reset the default settings for ${sectionName}? This action cannot be undone.`;
        if (window.confirm(message)) {
          onReset();
          alert('Done!');
        }
      }}
    >
      {sectionName === 'all' ? 'Reset all settings' : 'Reset to defaults'}
    </Button>
  );
};

export default SettingResetButton;
