'use client';

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  Tooltip,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import _ from 'lodash';
import { Address, isAddress, zeroAddress } from 'viem';
import { useAccount, useChainId, useContractWrite } from 'wagmi';
import 'react-diff-view/style/index.css';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import { useCannonPackage } from '@/hooks/cannon';
import { useExecutedTransactions } from '@/hooks/safe';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Alert } from '@/components/Alert';
import { links } from '@/constants/links';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';

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

  const toast = useToast();

  const stager = useTxnStager(safeTxn || {}, {
    safe: {
      chainId: parseInt(chainId ?? '') as any,
      address: safeAddress as Address,
    },
    onSignComplete: () => {
      router.push(links.DEPLOY);
      toast({
        title: 'You successfully signed the transaction.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    },
  });
  const execTxn = useContractWrite(stager.executeTxnConfig);

  const hintData = parseHintedMulticall(safeTxn?.data as any);

  const cannonPackage = useCannonPackage(
    hintData?.cannonPackage
      ? `@ipfs:${_.last(hintData?.cannonPackage.split('/'))}`
      : ''
  );

  return (
    <>
      {!hintData && (
        <Container p={16}>
          <Spinner m="auto" />
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
        <Box maxWidth="100%" mb="6">
          <Box
            bg="black"
            py={12}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Heading size="lg">Transaction #{nonce}</Heading>
              {(hintData.type == 'deploy' || hintData.type == 'invoke') && (
                <Box mt={3}>
                  <TransactionStepper
                    chainId={parsedChainId}
                    cannonPackage={cannonPackage}
                    safeTxn={safeTxn}
                  />
                </Box>
              )}
            </Container>
          </Box>

          <Container maxW="container.lg" mt={8}>
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
                        onClick={async () => {
                          if (execTxn.writeAsync) {
                            await execTxn.writeAsync();
                            router.push(links.DEPLOY);
                            toast({
                              title:
                                'You successfully executed the transaction.',
                              status: 'success',
                              duration: 5000,
                              isClosable: true,
                            });
                          }
                        }}
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
          </Container>
        </Box>
      )}
    </>
  );
};

export default TransactionDetailsPage;
