'use client';

import { FC, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Spinner,
  Alert,
  Button,
  Grid,
  HStack,
  Link,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import _ from 'lodash';
import {
  Address,
  TransactionRequestBase,
  hexToString,
  isAddress,
  zeroAddress,
} from 'viem';
import 'react-diff-view/style/index.css';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import {
  useCannonPackage,
  useCannonBuild,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import {
  useExecutedTransactions,
  useGetPreviousGitInfoQuery,
} from '@/hooks/safe';
import { parseHintedMulticall } from '@/helpers/cannon';
import { createSimulationData, getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import { links } from '@/constants/links';
import { WarningIcon, ExternalLinkIcon, CheckIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import { useContractWrite } from 'wagmi';
import * as chains from '@wagmi/core/chains';
import PublishUtility from './PublishUtility';
import { useAccount, useChainId } from 'wagmi';

const TransactionDetailsPage: FC<{
  safeAddress: string;
  chainId: string;
  nonce: string;
  sigHash: string;
}> = ({ safeAddress, chainId, nonce, sigHash }) => {
  const walletChainId = useChainId();
  const account = useAccount();

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

  const verify = parsedNonce >= safeNonce;

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

  const allowPublishing = hintData?.type == 'deploy';

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

  const stager = useTxnStager(safeTxn || {}, { safe: safe });
  const execTxn = useContractWrite(stager.executeTxnConfig);
  const router = useRouter();
  const toast = useToast();

  // git stuff
  const denom = hintData?.gitRepoUrl?.lastIndexOf(':');
  const gitUrl = hintData?.gitRepoUrl?.slice(0, denom);
  const gitFile = hintData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  const prevDeployHashQuery = useGetPreviousGitInfoQuery(
    safe,
    hintData?.gitRepoUrl ?? ''
  );

  let prevDeployGitHash: string;
  if (allowPublishing) {
    prevDeployGitHash =
      (hintData?.prevGitRepoHash || hintData?.gitRepoHash) ?? '';
  } else {
    prevDeployGitHash =
      prevDeployHashQuery.data &&
      ((prevDeployHashQuery.data[0].result as any).length as number) > 2
        ? ((prevDeployHashQuery.data[0].result as any).slice(2) as any)
        : hintData?.gitRepoHash;
  }

  const prevDeployPackageUrl = prevDeployHashQuery.data
    ? hexToString(prevDeployHashQuery.data[1].result || ('' as any))
    : '';

  const prevCannonDeployInfo = useCannonPackage(
    (hintData?.cannonUpgradeFromPackage || prevDeployPackageUrl
      ? `@ipfs:${_.last(
          (hintData?.cannonUpgradeFromPackage || prevDeployPackageUrl).split(
            '/'
          )
        )}`
      : null) || ''
  );

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl ?? '',
    hintData?.gitRepoHash ?? '',
    gitFile ?? ''
  );

  const buildInfo = useCannonBuild(
    safe,
    cannonDefInfo.def as any,
    prevCannonDeployInfo.pkg as any
  );

  useEffect(
    () => buildInfo.doBuild(),
    [verify && (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched)]
  );

  // compare proposed build info with expected transaction batch
  const expectedTxns = buildInfo.buildResult?.steps?.map(
    (s) => s.tx as unknown as Partial<TransactionRequestBase>
  );

  const unequalTransaction =
    expectedTxns &&
    (hintData?.txns.length !== expectedTxns.length ||
      hintData?.txns.find((t, i) => {
        return (
          t.to.toLowerCase() !== expectedTxns[i].to?.toLowerCase() ||
          t.data !== expectedTxns[i].data ||
          t.value.toString() !== expectedTxns[i].value?.toString()
        );
      }));

  const remainingSignatures =
    Number(stager.requiredSigners) - stager.existingSigners.length;
  const signers = verify ? stager.existingSigners : safeTxn?.confirmedSigners;
  const etherscanUrl =
    (Object.values(chains).find((chain) => chain.id === safe.chainId) as any)
      ?.blockExplorers?.etherscan?.url ?? 'https://etherscan.io';

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
                    publishable={allowPublishing}
                  />
                </Box>
              )}
            </Container>
          </Box>

          <Container maxW="container.lg" mt={8}>
            <Grid
              templateColumns={{ base: 'repeat(1, 1fr)', lg: '2fr 1fr' }}
              gap={8}
            >
              <Box>
                <TransactionDisplay
                  safe={safe}
                  safeTxn={safeTxn as any}
                  allowPublishing={allowPublishing}
                />
              </Box>
              <Box position="relative">
                <Box position="sticky" top={8}>
                  {verify && allowPublishing && (
                    <Box
                      background="gray.800"
                      p={4}
                      borderWidth="1px"
                      borderColor="gray.700"
                      mb={8}
                    >
                      <Heading size="sm" mb="2">
                        Verify Transactions
                      </Heading>
                      {buildInfo.buildStatus && (
                        <Text fontSize="sm" mb="2">
                          {buildInfo.buildStatus}
                        </Text>
                      )}
                      {buildInfo.buildError && (
                        <Text fontSize="sm" mb="2">
                          {buildInfo.buildError}
                        </Text>
                      )}
                      {buildInfo.buildResult && !unequalTransaction && (
                        <Text fontSize="sm" mb="2">
                          The transactions queued to the Safe match the Git
                          Target
                        </Text>
                      )}
                      {buildInfo.buildResult && unequalTransaction && (
                        <Text fontSize="sm" mb="2">
                          <WarningIcon />
                          &nbsp;Proposed Transactions Do not Match Git Diff.
                          Could be an attack.
                        </Text>
                      )}
                      {prevDeployPackageUrl &&
                        hintData.cannonUpgradeFromPackage !==
                          prevDeployPackageUrl && (
                          <Text fontSize="sm" mb="2">
                            <WarningIcon />
                            &nbsp;Previous Deploy Hash does not derive from
                            on-chain record
                          </Text>
                        )}
                      {safeTxn && (
                        <Button
                          size="xs"
                          as="a"
                          href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
                            safe.address
                          }&gas=${8000000}&gasPrice=0&value=${
                            safeTxn?.value
                          }&contractAddress=${
                            safe?.address
                          }&rawFunctionInput=${createSimulationData(
                            safeTxn
                          )}&network=${
                            safe.chainId
                          }&headerBlockNumber=&headerTimestamp=`}
                          colorScheme="purple"
                          rightIcon={<ExternalLinkIcon />}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Simulate on Tenderly
                        </Button>
                      )}
                    </Box>
                  )}

                  <Box
                    background="gray.800"
                    p={4}
                    borderWidth="1px"
                    borderColor="gray.700"
                    mb={8}
                  >
                    <Heading size="xs">Signatures</Heading>

                    {signers?.map((s, index) => (
                      <Box mt={2} key={index}>
                        <Box
                          backgroundColor="teal.500"
                          borderRadius="full"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          boxSize={5}
                          mr={2.5}
                        >
                          <CheckIcon color="white" boxSize={2.5} />
                        </Box>
                        <Text display="inline">
                          {`${s.substring(0, 6)}...${s.slice(-4)}`}
                          <Link
                            isExternal
                            styleConfig={{ 'text-decoration': 'none' }}
                            href={`${etherscanUrl}/address/${s}`}
                            ml={1}
                          >
                            <ExternalLinkIcon transform="translateY(-1px)" />
                          </Link>
                        </Text>
                      </Box>
                    ))}

                    {verify && remainingSignatures > 0 && (
                      <Text mt="2">
                        {remainingSignatures} more{' '}
                        {remainingSignatures === 1 ? 'signature' : 'signatures'}{' '}
                        required.
                      </Text>
                    )}

                    {verify && stager.alreadySigned && (
                      <Box mt={4}>
                        <Alert status="success">Transaction signed</Alert>
                      </Box>
                    )}
                    {verify && !stager.alreadySigned && (
                      <Box>
                        {account.isConnected &&
                        walletChainId === safe.chainId ? (
                          <HStack
                            gap="6"
                            mt={4}
                            marginLeft={'auto'}
                            marginRight={'auto'}
                          >
                            <Tooltip label={stager.signConditionFailed}>
                              <Button
                                size="lg"
                                w="100%"
                                isDisabled={
                                  (safeTxn &&
                                    !!stager.signConditionFailed) as any
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
                                  (safeTxn &&
                                    !!stager.execConditionFailed) as any
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
                            Please connect a wallet and ensure its connected to
                            the correct network to sign!
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>

                {allowPublishing && (
                  <Box
                    background="gray.800"
                    p={4}
                    borderWidth="1px"
                    borderColor="gray.700"
                    mb={8}
                  >
                    <Heading size="xs" mb="1">
                      Cannon Package
                    </Heading>

                    <PublishUtility
                      deployUrl={hintData.cannonPackage}
                      targetChainId={safe.chainId}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Container>
        </Box>
      )}
    </>
  );
};

export default TransactionDetailsPage;
