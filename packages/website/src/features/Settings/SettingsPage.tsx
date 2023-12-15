'use client';
import NextLink from 'next/link';
import {
  Alert,
  AlertIcon,
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
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import entries from 'just-entries';
import { Store, initialState, useStore } from '@/helpers/store';

type Setting = {
  title: string;
  placeholder?: string;
  description?: string;
  password?: boolean;
  optional?: boolean;
  // Validate function should return an error message if the value is invalid
  validate?: (value: any) => string | undefined;
};

const SETTINGS: Record<
  Exclude<
    keyof Store['settings'],
    'ipfsApiUrl' | 'isIpfsGateway' | 'customProviders' | 'pythUrl'
  >,
  Setting
> = {
  stagingUrl: {
    title: 'Safe Signature Collection Service',
    placeholder: 'https://service.com',
    description:
      'The same collection service URL must be used by all signers for a given transaction. Hosting Instructions: https://github.com/usecannon/cannon-safe-app-backend ',
  },
  registryAddress: {
    title: 'Registry Address',
    description: 'Contract address of the Cannon Registry.',
  },
};

export function useSettingsValidation() {
  const settings = useStore((s) => s.settings);

  return !entries(SETTINGS).some(([key, s]) => {
    const val = settings[key];
    return (!s.optional && !val) || !!s.validate?.(val);
  });
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const addProvider = () => {
    setSettings({ customProviders: [...settings.customProviders, ''] });
  };

  const updateProvider = (index: number, value: string) => {
    const updatedProviders = [...settings.customProviders];
    updatedProviders[index] = value;
    setSettings({ customProviders: updatedProviders });
  };

  const removeProvider = (index: number) => {
    const updatedProviders = [...settings.customProviders];
    updatedProviders.splice(index, 1);
    setSettings({ customProviders: updatedProviders });
  };

  return (
    <Container maxW="100%" w="container.md">
      <Box>
        <Alert
          bg="gray.800"
          status="info"
          my="10"
          border="1px solid"
          borderColor="gray.700"
        >
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
            <Text fontSize="sm" mb={3}>
              Cannon will use custom providers (which may include{' '}
              <Link isExternal href="https://www.alchemy.com/">
                Alchemy
              </Link>{' '}
              or{' '}
              <Link isExternal href="https://www.infura.io/">
                Infura
              </Link>{' '}
              endpoints) added below if available for the target chain.
              Otherwise, it will use{' '}
              <Link isExternal href="https://www.publicnode.com/">
                PublicNode
              </Link>
              .
            </Text>
            <FormLabel>Custom Providers</FormLabel>

            {settings.customProviders.map((provider, index) => (
              <Flex key={index} mb={3}>
                <Input
                  bg="black"
                  borderColor="whiteAlpha.400"
                  placeholder="e.g. https://mainnet.infura.io/v3/api_key"
                  value={provider}
                  onChange={(e) => updateProvider(index, e.target.value)}
                />
                {settings.customProviders.length > 1 && (
                  <Box ml="3">
                    <IconButton
                      colorScheme="blackAlpha"
                      background="transparent"
                      icon={<CloseIcon opacity="0.5" />}
                      aria-label={'Remove provider'}
                      onClick={() => removeProvider(index)}
                    />
                  </Box>
                )}
              </Flex>
            ))}

            <Button
              variant="outline"
              size="xs"
              colorScheme="green"
              color="green.400"
              borderColor="green.400"
              _hover={{ bg: 'green.900' }}
              onClick={addProvider}
            >
              Add Provider
            </Button>
          </Box>
          {/* <Box mb="6" bg="gray.900" p={3} borderRadius="md" shadow="sm">
            <InfoIcon mr={1} mt={-1} d="inline" /> Provider detected in
            connected wallet:{' '}
            <Text fontFamily="mono" display="inline">
              https://asdf.com
            </Text>
          </Box> */}
          <Heading size="sm" fontWeight={600} mb={1}>
            Oracle Multicalls
          </Heading>
          <Text fontSize="sm" mb={3}>
            Cannon implements{' '}
            <Link isExternal href="https://eips.ethereum.org/EIPS/eip-7412">
              ERC-7412
            </Link>{' '}
            to automatically compose transactions that require oracle data and
            fees. This is primarily used in the Interact tabs in the{' '}
            <Link as={NextLink} href="/search">
              package explorer
            </Link>
            . Multicalls are composed using a{' '}
            <Link
              as={NextLink}
              href="/packages/trusted-multicall-forwarder/latest/13370-main"
            >
              trusted multicall forwarder
            </Link>{' '}
            if integrated with the target protocol.
          </Text>
          <Box>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.400" px={0} pb={2} borderColor="gray.500">
                      Oracle ID
                    </Th>
                    <Th color="gray.400" px={0} pb={2} borderColor="gray.500">
                      Settings
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td px={0} borderColor="gray.500">
                      <Code fontSize="lg" p={0}>
                        PYTH
                      </Code>
                    </Td>
                    <Td px={0} borderColor="gray.500">
                      <FormControl>
                        <FormLabel>Price Service Endpoint</FormLabel>
                        <Input
                          bg="black"
                          borderColor="whiteAlpha.400"
                          type={'text'}
                          name={'pyth'}
                          value={settings.pythUrl}
                          onChange={(evt) =>
                            setSettings({ pythUrl: evt.target.value })
                          }
                        />
                        <FormHelperText color="gray.400">
                          You can{' '}
                          <Link
                            isExternal
                            href="https://docs.pyth.network/documentation/pythnet-price-feeds/price-service"
                          >
                            host your own price service
                          </Link>
                          .
                        </FormHelperText>
                      </FormControl>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
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
            Cannon work with an{' '}
            <Link
              isExternal
              href="https://docs.ipfs.tech/reference/http/gateway/"
            >
              IPFS HTTP Gateway URL
            </Link>{' '}
            or a{' '}
            <Link isExternal href="https://docs.ipfs.tech/reference/kubo/rpc/">
              Kubo RPC API URL
            </Link>
            . It must be a Kubo RPC API URL to publish packages using the{' '}
            <Link as={NextLink} href="/deploy">
              deployer
            </Link>
            .
          </Text>
          <FormControl>
            <FormLabel>HTTP API URL</FormLabel>
            <Input
              bg="black"
              borderColor="whiteAlpha.400"
              value={settings.ipfsApiUrl}
              type={'text'}
              name={'ipfsApiUrl'}
              onChange={async (evt) => {
                setSettings({ ipfsApiUrl: evt.target.value });
              }}
            />
            {settings.isIpfsGateway && (
              <FormHelperText color="gray.200">
                ⚠️ This appears to be an IPFS gateway. You must change this to a
                Kubo RPC API URL to publish packages using the deployer.
              </FormHelperText>
            )}
            {settings.ipfsApiUrl.includes('https://repo.usecannon.com') && (
              <FormHelperText color="gray.200">
                ⚠️ Currently, the Cannon IPFS Repo only supports downloading
                files from IPFS. You must change this to a Kubo RPC API URL to
                publish packages using the deployer.
              </FormHelperText>
            )}
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
            Configure the{' '}
            <Link as={NextLink} href="/deploy">
              deployer
            </Link>
            , which allows the staging and execution of builds for protocols
            controlled by{' '}
            <Link isExternal href="https://safe.global/">
              Safes
            </Link>
            .
          </Text>

          {entries(SETTINGS).map(([key, s]) => {
            const val = settings[key];
            const validationError =
              !val && val.length ? s.description : s.validate?.(settings[key]);

            return (
              <FormControl key={key} isInvalid={!!validationError} mb="4">
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
        <Alert
          bg="gray.800"
          status="info"
          mt="10"
          mb="5"
          border="1px solid"
          borderColor="gray.700"
        >
          <AlertIcon />
          Changes to settings automatically persist in your web browser.
        </Alert>
        <FormControl>
          <FormHelperText color="gray.300" mb={5} textAlign="right">
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (
                  window.confirm(
                    'Are you sure you want to reset to default settings? This can’t be undone.'
                  )
                ) {
                  setSettings(initialState.settings);
                  alert('Done!');
                }
              }}
            >
              Reset to defaults
            </Link>
          </FormHelperText>
        </FormControl>
      </Box>
    </Container>
  );
}
