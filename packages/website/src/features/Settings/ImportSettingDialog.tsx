import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Editor from '@monaco-editor/react';
import { useStore } from '@/helpers/store';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ImportSettingDialog = () => {
  const [open, setOpen] = useState(false);
  const settings = useStore((s) => s.settings);
  const safeTxServices = useStore((s) => s.safeTxServices);
  const setSafeTxServices = useStore((s) => s.setSafeTxServices);
  const setSettings = useStore((s) => s.setSettings);
  const [isFormatError, setIsFormatError] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');

  useEffect(() => {
    if (open) {
      const data = {
        safeTxServices,
        settings: {
          ipfsApiUrl: settings.ipfsApiUrl,
          cannonSafeBackendUrl: settings.cannonSafeBackendUrl,
          customProviders: settings.customProviders,
          pythUrl: settings.pythUrl,
        },
      };
      setJsonInput(JSON.stringify(data, null, 2));
      setIsFormatError(false);
    }
  }, [open]);

  const importSettings = () => {
    setIsFormatError(false);
    try {
      const obj = JSON.parse(jsonInput);
      setSafeTxServices(obj.safeTxServices);
      setSettings({
        ipfsApiUrl: obj.settings.ipfsApiUrl,
        cannonSafeBackendUrl: obj.settings.cannonSafeBackendUrl,
        customProviders: obj.settings.customProviders,
        pythUrl: obj.settings.pythUrl,
      });
      setOpen(false);
    } catch (error) {
      setIsFormatError(true);
    }
    return;
  };

  return (
    <>
      <Button
        variant="ghost"
        className={`flex-shrink-0 bg-background border border-border items-center justify-center`}
        onClick={() => setOpen(true)}
        data-testid="setting-dialog-button"
      >
        Edit settings
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl bg-transparent">
          <DialogHeader>
            <DialogTitle className="text-center">Import Settings</DialogTitle>
            <DialogDescription>
              Update your settings with JSON format.
            </DialogDescription>
          </DialogHeader>
          <Editor
            height="450px"
            theme="vs-dark"
            defaultLanguage="json"
            defaultValue="Loading settings..."
            value={jsonInput}
            onChange={(value) => setJsonInput(value ?? '')}
          />
          {isFormatError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                Invalid JSON format. Please check your input.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => {
                setOpen(false);
                setIsFormatError(false);
              }}
            >
              Close
            </Button>
            <Button onClick={() => importSettings()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportSettingDialog;
