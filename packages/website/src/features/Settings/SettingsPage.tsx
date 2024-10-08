'use client';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Code,
  Container,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
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
import { links } from '@/constants/links';
import { Alert } from '@/components/Alert';
import CustomProviders from '@/features/Settings/CustomProviders';
import SafeTransactionService from '@/features/Settings/SafeTransactionService';
import { initialState, useStore } from '@/helpers/store';
import { FC, PropsWithChildren } from 'react';

const SectionBox: FC<PropsWithChildren> = ({ children }) => (
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
    {children}
  </Box>
);

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <Container maxW="100%" w="container.md">
      <Box>
        <Alert status="info" my="10">
          Changes to settings automatically persist in your web browser.
        </Alert>

        <Heading size="lg" mb={6}>
          Settings
        </Heading>

        <SectionBox>
          <CustomProviders />
        </SectionBox>

        <SectionBox>
          <Heading size="md" mb={3}>
            Ethereum
          </Heading>
          <Box mb="6"></Box>

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
        </SectionBox>

        <SectionBox>
          <Heading size="md" mb={2}>
            IPFS
          </Heading>
          <Text fontSize="md" mb={4}>
            Enter a{' '}
            <Link isExternal href="https://docs.ipfs.tech/reference/kubo/rpc/">
              Kubo RPC API URL
            </Link>{' '}
            to download packages and publish them using the deployer.
          </Text>
          <FormControl mb={4}>
            <FormLabel>Kubo RPC API URL</FormLabel>
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
          </FormControl>
          {settings.ipfsApiUrl.length ? (
            <Button
              as={Link}
              textDecoration="none"
              variant="outline"
              size="xs"
              colorScheme="blue"
              color="blue.400"
              borderColor="blue.400"
              _hover={{ bg: 'blue.800', textDecoration: 'none' }}
              href={links.IPFS_DOWNLOAD}
            >
              Test IPFS Endpoint
            </Button>
          ) : null}
        </SectionBox>

        <SectionBox>
          <SafeTransactionService />
        </SectionBox>

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
