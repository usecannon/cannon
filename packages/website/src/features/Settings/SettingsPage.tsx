'use client';

import {
  Alert,
  AlertIcon,
  Box,
  Container,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
} from '@chakra-ui/react';
import entries from 'just-entries';
import { Store, useStore } from '@/helpers/store';
import { validatePreset } from '@/helpers/cannon';
import { isIpfsUploadEndpoint } from '@/helpers/ipfs';

type Setting = {
  title: string;
  placeholder?: string;
  description?: string;
  password?: boolean;
  optional?: boolean;
  // Validate function should return an error message if the value is invalid
  validate?: (value: string) => string | undefined;
};

const SETTINGS: Record<keyof Store['settings'], Setting> = {
  ipfsUrl: {
    title: 'IPFS Node URL',
    placeholder: 'http://localhost:5001',
    description:
      'Provide an IPFS URL to fetch Cannon packages and upload new builds.',
    validate: (val: string) => {
      if (val && !isIpfsUploadEndpoint(val)) {
        return 'Looks like you configured an IPFS URL that is not running on port 5001 nor is using the protocol https+ipfs://, which means that the gateway is not compatible with uploading new files. Are you sure you are using the correct ipfs node url?';
      }
    },
  },
  stagingUrl: {
    title: 'Staging Service URL',
    placeholder: 'https://service.com',
    description:
      'Provide a URL to stage transactions. Must be the same as other staged transaction operators to accumulate signatures.',
  },
  publishTags: {
    title: 'Package Tags',
    description:
      'Custom tags to add to the published Cannon package. Should be a string separated by commas.',
  },
  preset: {
    title: 'Package Preset',
    placeholder: 'main',
    description: 'Select the preset that will be used to build the package.',
    validate: (val: string) => {
      if (val && !validatePreset(val)) {
        return 'Invalid preset. Should only include lowercase letters.';
      }
    },
  },
  registryAddress: {
    title: 'Registry Address',
    description: 'Contract address of the Cannon Registry.',
  },
  registryProviderUrl: {
    title: 'Registry Provider RPC URL',
    description: 'JSON RPC url to connect with the Cannon Registry.',
  },
  forkProviderUrl: {
    title: 'RPC URL for Local Fork',
    description:
      'JSON RPC url to create the local fork where the build will be executed. If not provided, the default RPC url from your wallet will be used.',
    optional: true,
  },
};

export function useSettingsValidation() {
  const settings = useStore((s) => s.settings);

  return !entries(SETTINGS).some(([key, s]) => {
    const val = settings[key];
    return (!s.optional && !val) || !!s.validate?.(val);
  });
}

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <Container maxW="100%" w="container.sm">
      <Box pb="12">
        <Heading size="lg" mt="8" mb="4">
          Settings
        </Heading>

        <Alert
          bg="gray.800"
          border="1px solid"
          borderColor="gray.700"
          status="info"
          mb="8"
        >
          <AlertIcon />
          Changes to settings automatically persist in your web browser.
        </Alert>

        {entries(SETTINGS).map(([key, s]) => {
          const val = settings[key];
          const validationError =
            !s.optional && !val ? s.description : s.validate?.(settings[key]);

          return (
            <FormControl
              key={key}
              isInvalid={!!validationError}
              isRequired={!s.optional}
              mb="4"
            >
              <FormLabel>{s.title}</FormLabel>
              <Input
                type={s.password ? 'password' : 'text'}
                name={key}
                placeholder={s.placeholder}
                value={settings[key]}
                onChange={(evt) => setSettings({ [key]: evt.target.value })}
              />
              {!validationError && s.description && (
                <FormHelperText>{s.description}</FormHelperText>
              )}
              {validationError && (
                <FormErrorMessage>{validationError}</FormErrorMessage>
              )}
            </FormControl>
          );
        })}
      </Box>
    </Container>
  );
}
