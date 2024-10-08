import React, { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Text,
  Heading,
  FormErrorMessage,
  FormHelperText,
} from '@chakra-ui/react';
import { useStore } from '@/helpers/store';
import { z } from 'zod';

const SafeTransactionService: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [inputUrl, setInputUrl] = useState(settings.stagingUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  const urlSchema = z.string().url('Change not saved! Invalid URL format.');

  useEffect(() => {
    setInputUrl(settings.stagingUrl);
  }, [settings.stagingUrl]);

  const handleUrlChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    // Remove trailing slash if present
    const newUrl = evt.target.value.replace(/\/$/, '');
    setInputUrl(newUrl);

    try {
      urlSchema.parse(newUrl);
      setValidationError(null);
      setSettings({ stagingUrl: newUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  return (
    <>
      <Heading size="md" mb={3}>
        Safe Transaction Service
      </Heading>
      <Text fontSize="md" mb={4}>
        Enter the URL for the Safe Transaction Service.
      </Text>
      <FormControl isInvalid={!!validationError}>
        <FormLabel>Safe Transaction Service URL</FormLabel>
        <Input
          bg="black"
          borderColor="whiteAlpha.400"
          value={inputUrl}
          type="text"
          name="stagingUrl"
          onChange={handleUrlChange}
          placeholder="https://safe-transaction.example.com"
        />
        {validationError && (
          <FormErrorMessage>{validationError}</FormErrorMessage>
        )}
        <FormHelperText color="gray.300">
          The same collection service URL must be used by all signers for a
          given transaction. Hosting Instructions:
          https://github.com/usecannon/cannon-safe-app-backend
        </FormHelperText>
      </FormControl>
    </>
  );
};

export default SafeTransactionService;
