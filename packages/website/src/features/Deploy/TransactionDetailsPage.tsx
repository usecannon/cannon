'use client';

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Link,
  Tag,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import _ from 'lodash';
import { Address, isAddress, zeroAddress } from 'viem';
import { useAccount, useChainId, useContractWrite } from 'wagmi';
import 'react-diff-view/style/index.css';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import { useCannonPackage } from '@/hooks/cannon';
import { useExecutedTransactions } from '@/hooks/safe';
import { parseHintedMulticall } from '@/helpers/cannon';
import { parseIpfsHash } from '@/helpers/ipfs';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Alert } from '@/components/Alert';
import { links } from '@/constants/links';
import { TransactionDisplay } from './TransactionDisplay';

const TransactionDetailsPage: FC<{
  safeAddress: string;
  chainId: string;
  nonce: string;
  sigHash: string;
}> = ({ safeAddress, chainId, nonce, sigHash }) => {
  let parsedChainId = 0;
  let parsedNonce = 0;

  try {
    parsedChainId = parseInt(chainId ?? '');
    parsedNonce = parseInt(nonce ?? '');
  } catch (e) {
    // nothing
  }

  const walletChainId = useChainId();
  const account = useAccount();

  const router = useRouter();

  if (!isAddress(safeAddress ?? '')) {
    safeAddress = zeroAddress;
  }

  const safe: SafeDefinition = {
    chainId: parsedChainId,
    address: safeAddress as Address,
  };

  const { nonce: safeNonce, staged, stagedQuery } = useSafeTransactions(safe);

  const history = useExecutedTransactions(safe);

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null;

  if (parsedNonce < safeNonce) {
    // TODO: the gnosis safe transaction history is quite long, but if its not on the first page, we have to call "next" to get more txns until
    // we find the nonce we want. no way to just get the txn we want unfortunately
    // also todo: code dup
    safeTxn =
      history.results.find(
        (txn: any) =>
          txn._nonce.toString() === nonce &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, txn))
      ) || null;
  } else if (staged) {
    safeTxn =
      staged.find(
        (s) =>
          s.txn._nonce.toString() === nonce &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, s.txn))
      )?.txn || null;
  }

  const stager = useTxnStager(safeTxn || {}, {
    safe: {
      chainId: parseInt(chainId ?? '') as any,
      address: safeAddress as Address,
    },
    onSignComplete: () => {
      router.push(links.DEPLOY);
    },
  });
  const execTxn = useContractWrite(stager.executeTxnConfig);

  const hintData = parseHintedMulticall(safeTxn?.data as any);

  const cannonPackage = useCannonPackage(
    `@ipfs:${_.last(hintData?.cannonPackage.split('/'))}`
  );

  const reverseLookupCannonPackage = useCannonPackage(
    `${cannonPackage.resolvedName}:${cannonPackage.resolvedVersion}`
  );

  const executed = Number(safeNonce) > Number(nonce);
  const awaitingExecution = !safeTxn || !stager.execConditionFailed;
  let status = 'awaiting signatures';

  if (awaitingExecution) {
    status = 'awaiting execution';
  } else if (executed) {
    status = 'executed';
  }

  const formatHash = (hash: string): string => {
    const id = parseIpfsHash(hash);
    return id
      ? `ipfs://${id.substring(0, 4)}...${id.substring(id.length - 4)}`
      : hash;
  };

  // Function to create IPLD link
  const createIPLDLink = (hash: string): string => {
    if (hash.startsWith('ipfs://')) {
      const parts = hash.split('/');
      const id = parts[2];
      return `https://explore.ipld.io/#/explore/${id}`;
    }
    return '';
  };

  return (
    <>
      {!hintData && (
        <Container>
          <Text>Not a Deployer staged transaction.</Text>
        </Container>
      )}
      {hintData && !safeTxn && stagedQuery.isFetched && (
        <Container>
          <Text>
            Transaction not found! Current safe nonce:{' '}
            {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
            {_.last(staged)?.txn._nonce || safeNonce}
          </Text>
        </Container>
      )}
      {hintData && (safeTxn || !stagedQuery.isFetched) && (
        <Box p="12" pt="2" maxWidth="100%">
          <Flex
            direction="row"
            alignItems="center"
            borderBottom="1px solid"
            borderColor="whiteAlpha.300"
            pb="6"
            mb="6"
          >
            <Box>
              <Text fontSize="sm" mb="1.5" opacity={0.9}>
                <strong>Safe:</strong> {safeAddress} (Chain ID: {chainId})
              </Text>
              <Heading size="lg">Transaction #{nonce}</Heading>
            </Box>
            <Flex ml="auto">
              {hintData && (
                <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
                  <FormControl>
                    <FormLabel mb="1.5">Transaction&nbsp;Source</FormLabel>

                    {hintData.type === 'deploy' && (
                      <Tooltip label="Added using 'Queue From GitOps'">
                        <Tag textTransform="uppercase" size="md">
                          <Text as="b">GitOps</Text>
                        </Tag>
                      </Tooltip>
                    )}

                    {hintData.type === 'invoke' && (
                      <Tooltip label="Added using 'Queue Transactions'">
                        <Tag textTransform="uppercase" size="md">
                          <Text as="b">Deployer</Text>
                        </Tag>
                      </Tooltip>
                    )}

                    {hintData.type !== 'deploy' &&
                      hintData.type !== 'invoke' && (
                        <Tooltip label="Added using the Safe{Wallet} UI">
                          <Tag textTransform="uppercase" size="md">
                            <Text as="b">External</Text>
                          </Tag>
                        </Tooltip>
                      )}
                  </FormControl>
                </Box>
              )}
              <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
                <FormControl>
                  <FormLabel mb="1.5">Transaction&nbsp;Status</FormLabel>
                  <Tag
                    textTransform="uppercase"
                    size="md"
                    colorScheme={status == 'executed' ? 'green' : 'orange'}
                  >
                    <Text as="b">{status}</Text>
                  </Tag>
                </FormControl>
              </Box>
              {hintData && (
                <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
                  <FormControl>
                    <FormLabel mb="1">Cannon&nbsp;Package</FormLabel>
                    {reverseLookupCannonPackage.pkgUrl ? (
                      <Box>
                        <Link
                          href={
                            'https://usecannon.com/packages/' +
                            cannonPackage.resolvedName
                          }
                          isExternal
                        >
                          {reverseLookupCannonPackage.pkgUrl ===
                          hintData.cannonPackage ? (
                            <CheckIcon color={'green'} />
                          ) : (
                            <WarningIcon color="red" />
                          )}
                          &nbsp;{cannonPackage.resolvedName}:
                          {cannonPackage.resolvedVersion}
                        </Link>
                        &nbsp;(
                        <Link
                          href={createIPLDLink(hintData.cannonPackage)}
                          isExternal
                        >
                          {formatHash(hintData.cannonPackage)}
                          <ExternalLinkIcon transform="translate(4px,-2px)" />
                        </Link>
                        )
                      </Box>
                    ) : (
                      <Link
                        href={createIPLDLink(hintData.cannonPackage)}
                        isExternal
                      >
                        {formatHash(hintData.cannonPackage)}
                        <ExternalLinkIcon transform="translate(4px,-2px)" />
                      </Link>
                    )}
                  </FormControl>
                </Box>
              )}
            </Flex>
          </Flex>
          <TransactionDisplay
            safe={safe}
            safeTxn={safeTxn as any}
            verify={parsedNonce >= safeNonce}
            allowPublishing
          />
          {stager.alreadySigned && (
            <Alert status="success">Transaction successfully signed!</Alert>
          )}
          {!stager.alreadySigned && parsedNonce >= safeNonce && (
            <Box>
              {account.isConnected && walletChainId === parsedChainId ? (
                <HStack
                  gap="6"
                  marginTop="20px"
                  marginLeft={'auto'}
                  marginRight={'auto'}
                >
                  <Tooltip label={stager.signConditionFailed}>
                    <Button
                      size="lg"
                      w="100%"
                      isDisabled={
                        (safeTxn && !!stager.signConditionFailed) as any
                      }
                      onClick={() => stager.sign()}
                    >
                      Sign
                    </Button>
                  </Tooltip>
                  <Tooltip label={stager.execConditionFailed}>
                    <Button
                      size="lg"
                      w="100%"
                      isDisabled={
                        (safeTxn && !!stager.execConditionFailed) as any
                      }
                      onClick={() => execTxn.write && execTxn.write()}
                    >
                      Execute
                    </Button>
                  </Tooltip>
                </HStack>
              ) : (
                <Text align={'center'}>
                  Please connect a wallet and ensure its connected to the
                  correct network to sign!
                </Text>
              )}
            </Box>
          )}
        </Box>
      )}
    </>
  );
};

export default TransactionDetailsPage;
