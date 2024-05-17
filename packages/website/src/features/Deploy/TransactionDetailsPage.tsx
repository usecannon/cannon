'use client';

import { parseHintedMulticall } from '@/helpers/cannon';
import { createSimulationData, getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import {
  useExecutedTransactions,
  useGetPreviousGitInfoQuery,
} from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import {
  CheckIcon,
  ExternalLinkIcon,
  InfoOutlineIcon,
  WarningIcon,
} from '@chakra-ui/icons';
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  Image,
  Link,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import * as chains from '@wagmi/core/chains';
import _, { find } from 'lodash';
import { FC, useEffect, useState } from 'react';
import {
  Address,
  hexToString,
  isAddress,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import {
  useAccount,
  useChainId,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import PublishUtility from './PublishUtility';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import 'react-diff-view/style/index.css';
import { truncateAddress } from '@/helpers/ethereum';

const TransactionDetailsPage: FC<{
  safeAddress: string;
  chainId: string;
  nonce: string;
  sigHash: string;
}> = ({ safeAddress, chainId, nonce, sigHash }) => {
  const [executionTxnHash, setExecutionTxnHash] = useState<string | null>(null);
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  const account = useAccount();

  const parsedChainId = parseInt(chainId ?? '0') || 0;
  const parsedNonce = parseInt(nonce ?? '0') || 0;

  if (!isAddress(safeAddress ?? '')) {
    safeAddress = zeroAddress;
  }

  const safe: SafeDefinition = {
    chainId: parsedChainId,
    address: safeAddress as Address,
  };

  const {
    nonce: safeNonce,
    staged,
    stagedQuery,
    nonceQuery,
  } = useSafeTransactions(safe);

  const isTransactionExecuted = parsedNonce < safeNonce;

  const { data: history, refetch: refetchHistory } =
    useExecutedTransactions(safe);

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

  const queuedWithGitOps = hintData?.type == 'deploy';

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
  const execTxn = useWriteContract();
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
  if (queuedWithGitOps) {
    prevDeployGitHash =
      (hintData?.prevGitRepoHash || hintData?.gitRepoHash) ?? '';
  } else {
    prevDeployGitHash =
      prevDeployHashQuery.data &&
      prevDeployHashQuery.data[0].result &&
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
    cannonDefInfo.def,
    prevCannonDeployInfo.pkg
  );

  useEffect(
    () => buildInfo.doBuild(),
    [
      !isTransactionExecuted &&
        (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
    ]
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

  const etherscanUrl =
    (Object.values(chains).find((chain) => chain.id == safe.chainId) as any)
      ?.blockExplorers?.default?.url ?? 'https://etherscan.io';

  const signers: Array<string> = stager.existingSigners.length
    ? stager.existingSigners
    : safeTxn?.confirmedSigners || [];

  const threshold: number =
    Number(stager.requiredSigners) || safeTxn?.confirmationsRequired || 0;

  const remainingSignatures = threshold - signers.length;

  const chainName = find(
    chains,
    (chain: any) => chain.id === safe.chainId
  )?.name;

  return (
    <>
      {!hintData && (
        <Container p={24} textAlign="center">
          <Spinner />
        </Container>
      )}
      {hintData && !safeTxn && stagedQuery.isFetched && (
        <Container>
          <Text>
            Transaction not found! Current safe nonce:{' '}
            {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
            {(_.last(staged)?.txn._nonce || safeNonce).toString()}
          </Text>
        </Container>
      )}
      {hintData && (safeTxn || !stagedQuery.isFetched) && (
        <Box maxWidth="100%" mb="6">
          <Box
            bg="black"
            py={[6, 6, 12]}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Heading size="lg">Transaction #{nonce}</Heading>
              {(hintData.type == 'deploy' || hintData.type == 'invoke') && (
                <Box mt={4}>
                  <TransactionStepper
                    chainId={parsedChainId}
                    cannonPackage={cannonPackage}
                    safeTxn={safeTxn}
                    published={existingRegistryUrl == hintData?.cannonPackage}
                    publishable={queuedWithGitOps}
                    signers={signers}
                    threshold={threshold}
                  />
                </Box>
              )}
            </Container>
          </Box>

          <Container maxW="container.lg" mt={[6, 6, 12]}>
            <Grid
              templateColumns={{ base: 'repeat(1, 1fr)', lg: '2fr 1fr' }}
              gap={6}
            >
              <TransactionDisplay
                safe={safe}
                safeTxn={safeTxn as any}
                queuedWithGitOps={queuedWithGitOps}
                showQueueSource={true}
                isTransactionExecuted={isTransactionExecuted}
              />
              <Box position="relative">
                <Box position="sticky" top={8}>
                  <Box
                    background="gray.800"
                    p={4}
                    borderWidth="1px"
                    borderColor="gray.700"
                    mb={6}
                  >
                    {!executionTxnHash ? (
                      <>
                        <Heading
                          size="sm"
                          mb="3"
                          fontWeight="medium"
                          textTransform="uppercase"
                          letterSpacing="1.5px"
                          fontFamily="var(--font-miriam)"
                          textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
                        >
                          Signatures
                        </Heading>

                        {signers?.map((s, index) => (
                          <Box mt={2.5} key={index}>
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
                            <Text
                              display="inline"
                              fontFamily="mono"
                              fontWeight={200}
                              color="gray.200"
                            >
                              {`${s.substring(0, 8)}...${s.slice(-6)}`}
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

                        {!isTransactionExecuted && remainingSignatures > 0 && (
                          <Text fontWeight="bold" mt="3">
                            {remainingSignatures} additional{' '}
                            {remainingSignatures === 1
                              ? 'signature'
                              : 'signatures'}{' '}
                            required
                          </Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Heading
                          size="sm"
                          mb="3"
                          fontWeight="medium"
                          textTransform="uppercase"
                          letterSpacing="1.5px"
                          fontFamily="var(--font-miriam)"
                          textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
                        >
                          Execution
                        </Heading>

                        <Text fontSize="sm" fontWeight="medium" mt={3}>
                          Transaction pending on network
                        </Text>
                        <Link
                          href={`${etherscanUrl}/tx/${executionTxnHash}`}
                          isExternal
                          fontSize="sm"
                          fontWeight="medium"
                          mt={3}
                        >
                          {truncateAddress(
                            (executionTxnHash || '') as string,
                            8
                          )}
                          <ExternalLinkIcon
                            transform="translateY(-1px)"
                            ml={1}
                          />
                        </Link>
                      </>
                    )}

                    {!isTransactionExecuted && !executionTxnHash && (
                      <Flex mt={4} gap={4}>
                        {account.isConnected &&
                        walletChainId === safe.chainId ? (
                          <>
                            <Tooltip label={stager.signConditionFailed}>
                              <Button
                                colorScheme="teal"
                                mb={3}
                                w="100%"
                                isDisabled={
                                  stager.alreadySigned ||
                                  executionTxnHash ||
                                  ((safeTxn &&
                                    !!stager.signConditionFailed) as any)
                                }
                                onClick={() => stager.sign()}
                              >
                                Sign
                              </Button>
                            </Tooltip>
                            <Tooltip label={stager.execConditionFailed}>
                              <Button
                                colorScheme="teal"
                                w="100%"
                                isDisabled={
                                  !stager.executeTxnConfig ||
                                  executionTxnHash ||
                                  ((safeTxn &&
                                    !!stager.execConditionFailed) as any)
                                }
                                onClick={() => {
                                  if (!stager.executeTxnConfig) {
                                    throw new Error(
                                      'Missing execution tx configuration'
                                    );
                                  }

                                  execTxn.writeContract(
                                    stager.executeTxnConfig,
                                    {
                                      onSuccess: async (hash) => {
                                        setExecutionTxnHash(hash);
                                        toast({
                                          title: 'Transaction sent to network',
                                          status: 'info',
                                          duration: 5000,
                                          isClosable: true,
                                        });

                                        // wait for the transaction to be mined
                                        await publicClient!.waitForTransactionReceipt(
                                          { hash }
                                        );

                                        await stagedQuery.refetch();
                                        await nonceQuery.refetch();
                                        await refetchHistory();

                                        toast({
                                          title:
                                            'You successfully executed the transaction.',
                                          status: 'success',
                                          duration: 5000,
                                          isClosable: true,
                                        });

                                        setExecutionTxnHash(null);
                                      },
                                    }
                                  );
                                }}
                              >
                                Execute
                              </Button>
                            </Tooltip>
                          </>
                        ) : (
                          <Text fontSize="xs" fontWeight="medium" mt={3}>
                            <InfoOutlineIcon
                              transform="translateY(-1.5px)"
                              mr={1.5}
                            />
                            Connect your wallet {chainName && `to ${chainName}`}{' '}
                            to sign
                          </Text>
                        )}
                      </Flex>
                    )}
                  </Box>

                  {!isTransactionExecuted && queuedWithGitOps && (
                    <Box
                      background="gray.800"
                      p={4}
                      borderWidth="1px"
                      borderColor="gray.700"
                      mb={8}
                    >
                      <Heading
                        size="sm"
                        mb={3}
                        fontWeight="medium"
                        textTransform="uppercase"
                        letterSpacing="1.5px"
                        fontFamily="var(--font-miriam)"
                        textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
                      >
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
                          <Flex fontSize="xs" fontWeight="medium" align="top">
                            <InfoOutlineIcon mt="3px" mr={1.5} />
                            The previous deploy hash does not derive from an
                            on-chain record.
                          </Flex>
                        )}
                      {safeTxn && (
                        <Button
                          mt={3}
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
                          colorScheme="whiteAlpha"
                          background="whiteAlpha.100"
                          border="1px solid"
                          borderColor="whiteAlpha.300"
                          leftIcon={
                            <Image
                              height="14px"
                              src="/images/tenderly.svg"
                              alt="Safe"
                              objectFit="cover"
                            />
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          _hover={{
                            bg: 'whiteAlpha.200',
                            borderColor: 'whiteAlpha.400',
                          }}
                        >
                          Simulate Transaction
                        </Button>
                      )}
                    </Box>
                  )}

                  {queuedWithGitOps && (
                    <Box
                      background="gray.800"
                      p={4}
                      borderWidth="1px"
                      borderColor="gray.700"
                      mb={8}
                    >
                      <Heading
                        size="sm"
                        mb={3}
                        fontWeight="medium"
                        textTransform="uppercase"
                        letterSpacing="1.5px"
                        fontFamily="var(--font-miriam)"
                        textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
                      >
                        Cannon Package
                        <Tooltip label="Packages includes data about this deployment (including smart contract addresses, ABIs, and source code).">
                          <InfoOutlineIcon ml={1.5} opacity={0.8} mt={-0.5} />
                        </Tooltip>
                      </Heading>

                      <PublishUtility
                        deployUrl={hintData.cannonPackage}
                        targetChainId={safe.chainId}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Container>
        </Box>
      )}
    </>
  );
};

export default TransactionDetailsPage;
