'use client';
import NextLink from 'next/link';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Container,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Link,
  Text,
} from '@chakra-ui/react';
import { CloseIcon, InfoIcon } from '@chakra-ui/icons';
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
    <Container maxW="100%" w="container.md">
      <Box>
        <Alert bg="gray.800" status="info" my="10">
          <AlertIcon />
          Changes to settings automatically persist in your web browser.
        </Alert>
        <Heading size="lg" mb={6}>
          Settings
        </Heading>
        <Box
          mb={6}
          p={6}
          bg="gray.800"
          display="block"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="gray.600"
          borderRadius="4px"
        >
          <Heading size="md" mb={3}>
            Ethereum
          </Heading>
          <Box mb="6">
            <Heading size="sm" fontWeight={600} mb={1}>
              Provider
            </Heading>
            <Text fontSize="sm">
              Cannon connects to Ethereum via providers from your wallet
              application like Metamask, Rabby, or Frame if connected.
              Otherwise, it uses publicnode.org. Add Custom RPCS (like from
              Alchemy or Infura) below.
            </Text>
            <Box my="4" bg="gray.900" p={2} borderRadius="md" shadow="sm">
              <InfoIcon /> <Code>https://asdf.com</Code> detected in your
              connected wallet
            </Box>
            <Flex>
              <Input placeholder="https://infura.com/...." />
              <Box ml="3">
                <IconButton icon={<CloseIcon />} aria-label={'Remove'} />
              </Box>
            </Flex>
            <Button size="xs" colorScheme="green" mt="4">
              Add another custon RPC
            </Button>
          </Box>
          <Heading size="sm" fontWeight={600} mb={1}>
            Oracle Multicalls
          </Heading>
          <Text fontSize="sm" mb={3}>
            Cannon implements{' '}
            <Link isExternal href="https://eips.ethereum.org/EIPS/eip-7412">
              ERC-7412
            </Link>
            , a draft standard to automatically compose transactions that
            require oracle data and fees. This is primarily used in the Interact
            tabs in the{' '}
            <Link as={NextLink} href="/search">
              package explorer
            </Link>
            .
          </Text>
          <Box>
            <Text fontSize="xs">Oracle ID</Text>
            <Text fontSize="lg" fontWeight="bold" mb={1}>
              PYTH
            </Text>

            <FormControl mb="4">
              <FormLabel>Pythnet Gateway URI</FormLabel>
              <Input
                bg="black"
                borderColor="whiteAlpha.400"
                type={'text'}
                name={'pyth'}
              />
            </FormControl>
          </Box>
        </Box>

        <Box
          mb={6}
          p={6}
          bg="gray.800"
          display="block"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="gray.600"
          borderRadius="4px"
        >
          <Heading size="md" mb={2}>
            IPFS
          </Heading>

          <Text fontSize="md" mb={4}>
            Note about gateways and publish. Something about running a local
            node.
          </Text>

          <FormControl mb="4">
            <FormLabel>IPFS Query URL</FormLabel>
            <Input
              bg="black"
              borderColor="whiteAlpha.400"
              value="http://ipfs.io"
              type={'text'}
              name={'ipfsread'}
            />
          </FormControl>

          <FormControl mb="4">
            <FormLabel>IPFS Pinning URL</FormLabel>
            <Input
              bg="black"
              borderColor="whiteAlpha.400"
              type={'text'}
              name={'ipfspublish'}
            />
          </FormControl>
        </Box>
        <Box
          mb={6}
          p={6}
          bg="gray.800"
          display="block"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="gray.600"
          borderRadius="4px"
        >
          <Heading size="md" mb={2}>
            Deployer
          </Heading>

          <Text fontSize="md" mb={4}>
            Something something{' '}
            <Link as={NextLink} href="/deploy">
              deployer
            </Link>
          </Text>

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
                  bg="black"
                  borderColor="whiteAlpha.400"
                  type={s.password ? 'password' : 'text'}
                  name={key}
                  placeholder={s.placeholder}
                  value={settings[key]}
                  onChange={(evt) => setSettings({ [key]: evt.target.value })}
                />
                {!validationError && s.description && (
                  <FormHelperText color="gray.300">
                    {s.description}
                  </FormHelperText>
                )}
                {validationError && (
                  <FormErrorMessage>{validationError}</FormErrorMessage>
                )}
              </FormControl>
            );
          })}
        </Box>
        <Alert bg="gray.800" status="info" my="10">
          <AlertIcon />
          Changes to settings automatically persist in your web browser.
        </Alert>
      </Box>
    </Container>
  );
}
