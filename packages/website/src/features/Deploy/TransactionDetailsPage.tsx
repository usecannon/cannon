'use client';

import { FC } from 'react';
import { Box, Container, Heading, Text, Spinner } from '@chakra-ui/react';
import _ from 'lodash';
import { Address, isAddress, zeroAddress } from 'viem';
import 'react-diff-view/style/index.css';
import { useSafeTransactions } from '@/hooks/backend';
import { useCannonPackage } from '@/hooks/cannon';
import { useExecutedTransactions } from '@/hooks/safe';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
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

  const hintData = parseHintedMulticall(safeTxn?.data as any);

  const cannonPackage = useCannonPackage(
    hintData?.cannonPackage
      ? `@ipfs:${_.last(hintData?.cannonPackage.split('/'))}`
      : ''
  );

  // then reverse check the package referenced by the
  const { pkgUrl: existingRegistryUrl } = useCannonPackage(
    `${cannonPackage.resolvedName}:${cannonPackage.resolvedVersion}@${cannonPackage.resolvedPreset}`,
    parsedChainId
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
                    published={existingRegistryUrl == hintData?.cannonPackage}
                    publishable={hintData.type == 'deploy'}
                  />
                </Box>
              )}
            </Container>
          </Box>

          <Container maxW="container.lg" mt={8}>
            <TransactionDisplay
              safe={safe}
              safeTxn={safeTxn as any}
              parsedNonce={parsedNonce}
              safeNonce={Number(safeNonce)}
              allowPublishing={hintData.type == 'deploy'}
            />
          </Container>
        </Box>
      )}
    </>
  );
};

export default TransactionDetailsPage;
