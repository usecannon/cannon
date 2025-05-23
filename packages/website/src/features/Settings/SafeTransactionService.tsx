import React, { useState, useEffect } from 'react';
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { initialState, useStore } from '@/helpers/store';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import SettingResetButton from '@/features/Settings/SettingResetButton';

const formSchema = z.object({
  cannonSafeBackendUrl: z.string().url('Change not saved! Invalid URL format'),
});

type FormValues = z.infer<typeof formSchema>;

const SafeTransactionService: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cannonSafeBackendUrl: settings.cannonSafeBackendUrl,
    },
  });

  const [inputUrl, setInputUrl] = useState(settings.cannonSafeBackendUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  const urlSchema = z.string().url('Change not saved! Invalid URL format.');

  useEffect(() => {
    setInputUrl(settings.cannonSafeBackendUrl);
  }, [settings.cannonSafeBackendUrl]);

  const handleUrlChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    // Remove trailing slash if present
    const newUrl = evt.target.value.replace(/\/$/, '');
    setInputUrl(newUrl);

    try {
      urlSchema.parse(newUrl);
      setValidationError(null);
      setSettings({ cannonSafeBackendUrl: newUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-4">
          <FormControl>
            <FormItem className={validationError ? 'space-y-1' : ''}>
              <FormLabel>Safe Transaction Service URL</FormLabel>
              <Input
                className="bg-black border-white/40"
                value={inputUrl}
                type="text"
                name="cannonSafeBackendUrl"
                onChange={handleUrlChange}
                placeholder="https://safe-transaction.example.com"
              />
              {validationError && <FormMessage>{validationError}</FormMessage>}
              <FormDescription className="text-gray-300">
                The same collection service URL must be used by all signers for
                a given transaction. Hosting Instructions are available on{' '}
                <a
                  className="underline"
                  href="https://github.com/usecannon/cannon-safe-app-backend"
                >
                  GitHub
                </a>
                .
              </FormDescription>
            </FormItem>
          </FormControl>
        </form>
      </Form>
      <SettingResetButton
        onReset={() =>
          setSettings({
            cannonSafeBackendUrl: initialState.settings.cannonSafeBackendUrl,
          })
        }
        sectionName="Safe Transaction Service URL"
      />
    </>
  );
};

export default SafeTransactionService;
