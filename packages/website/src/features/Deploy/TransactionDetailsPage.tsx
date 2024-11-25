'use client';

import { Alert } from '@/components/Alert';
import Card from '@/components/Card';
import { parseHintedMulticall } from '@/helpers/cannon';
import { truncateAddress } from '@/helpers/ethereum';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition, useStore } from '@/helpers/store';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useTransactionDetailsParams } from '@/hooks/routing/useTransactionDetailsParams';
import {
  useExecutedTransactions,
  useGetPreviousGitInfoQuery,
} from '@/hooks/safe';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
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
  ButtonProps,
  Container,
  Flex,
  Grid,
  Heading,
  Link,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import _ from 'lodash';
import {
  FC,
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IoIosContract, IoIosExpand } from 'react-icons/io';
import { Hash, Hex, hexToString, TransactionRequestBase } from 'viem';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import PublishUtility from './PublishUtility';
import { SimulateTransactionButton } from './SimulateTransactionButton';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import 'react-diff-view/style/index.css';
import { ChainDefinition } from '@usecannon/builder';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';

const AdditionalSignaturesText = ({ amount }: { amount: number }) => (
  <Text fontWeight="bold" mt="3">
    {amount} additional {amount === 1 ? 'signature' : 'signatures'} required
  </Text>
);

const UnorderedNonceWarning = ({ nextNonce }: { nextNonce: number }) => (
  <Alert status="warning" mt={3}>
    <Text fontSize="sm">You must execute transaction #{nextNonce} first.</Text>
  </Alert>
);

const CustomButton: FC<ButtonProps & PropsWithChildren> = (props) => (
  <Button colorScheme="teal" w="100%" {...props}></Button>
);

function TransactionDetailsPage() {
  const { safeAddress, chainId, nonce, sigHash } =
    useTransactionDetailsParams();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { getChainById, getExplorerUrl } = useCannonChains();
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  const account = useAccount();

  const currentSafe = useStore((s) => s.currentSafe);
  const [expandDiff, setExpandDiff] = useState<boolean>(false);
  const [executionTxnHash, setExecutionTxnHash] = useState<Hash | null>(null);
  const accountAlreadyConnected = useRef(account.isConnected);
  const chainDefinitionRef = useRef<ChainDefinition>();

  const safe: SafeDefinition = useMemo(
    () => ({
      chainId,
      address: safeAddress,
    }),
    [chainId, safeAddress]
  );

  const safeChain = useMemo(
    () => getChainById(safe.chainId),
    [safe, getChainById]
  );
  if (!safeChain) {
    throw new Error('Safe Chain not supported');
  }

  const {
    nonce: safeNonce,
    staged,
    refetch: refetchSafeTxs,
    isFetched: isSafeTxsFetched,
  } = useSafeTransactions(safe);

  const isTransactionExecuted = nonce < safeNonce;

  const { data: history, refetch: refetchHistory } =
    useExecutedTransactions(safe);

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null;

  if (safeNonce && nonce < safeNonce) {
    // TODO: the gnosis safe transaction history is quite long, but if its not on the first page, we have to call "next" to get more txns until
    // we find the nonce we want. no way to just get the txn we want unfortunately
    // also todo: code dup
    safeTxn =
      history.results.find(
        (txn: any) =>
          txn._nonce.toString() === nonce.toString() &&
          (!sigHash ||
            sigHash === txn.safeTxHash ||
            sigHash === getSafeTransactionHash(safe, txn))
      ) || null;
  } else if (Array.isArray(staged) && staged.length) {
    safeTxn =
      staged.find(
        (s) =>
          s.txn._nonce.toString() === nonce.toString() &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, s.txn))
      )?.txn || null;
  }

  const unorderedNonce = safeTxn && safeTxn._nonce > staged[0]?.txn._nonce;
  const hintData = safeTxn ? parseHintedMulticall(safeTxn.data as Hex) : null;

  const queuedWithGitOps = hintData?.type == 'deploy';

  useEffect(() => {
    const switchChain = async () => {
      if (account.isConnected && !accountAlreadyConnected.current) {
        accountAlreadyConnected.current = true;
        if (account.chainId !== currentSafe?.chainId.toString()) {
          try {
            await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
          } catch (e) {
            toast({
              title:
                'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return;
          }
        }
      }
    };
    void switchChain();
  }, [account.isConnected, currentSafe?.chainId]);

  const cannonPackage = useCannonPackage(hintData?.cannonPackage);

  // then reverse check the package referenced by the
  const { pkgUrl: existingRegistryUrl } = useCannonPackage(
    cannonPackage.fullPackageRef!,
    chainId
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
      ? `ipfs://${_.last(
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

  useEffect(() => {
    const getChainDef = async () => {
      if (!cannonDefInfo.def) return;

      chainDefinitionRef.current = await getChainDefinitionFromWorker(
        cannonDefInfo.def
      );
    };

    void getChainDef();
  }, [cannonDefInfo.def]);

  const buildInfo = useCannonBuild(
    safe,
    chainDefinitionRef.current,
    prevCannonDeployInfo.ipfsQuery.data?.deployInfo
  );

  useEffect(() => {
    if (
      !safe ||
      !chainDefinitionRef.current ||
      !prevCannonDeployInfo.ipfsQuery.data?.deployInfo
    )
      return;
    buildInfo.doBuild();
  }, [
    !isTransactionExecuted &&
      (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
    chainDefinitionRef.current,
  ]);

  // compare proposed build info with expected transaction batch
  const expectedTxns = buildInfo.buildResult?.safeSteps?.map(
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

  const signers: Array<Hash> = stager.existingSigners.length
    ? stager.existingSigners
    : safeTxn?.confirmedSigners || [];

  const threshold =
    Number(stager.requiredSigners) || safeTxn?.confirmationsRequired || 0;

  const remainingSignatures = threshold - signers.length;

  const gitDiffContainerRef = useRef<HTMLDivElement>(null);

  const handleConnectWalletAndSign = async () => {
    if (!account.isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }

      toast({
        title: 'In order to sign you must connect your wallet first.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });

      return;
    }

    if (account.chainId !== currentSafe?.chainId.toString()) {
      try {
        await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
      } catch (e) {
        toast({
          title:
            'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }
  };

  const handleExecuteTx = () => {
    if (!stager.executeTxnConfig) {
      throw new Error('Missing execution tx configuration');
    }

    execTxn.writeContract(stager.executeTxnConfig, {
      onSuccess: async (hash) => {
        setExecutionTxnHash(hash);
        toast({
          title: 'Transaction sent to network',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });

        // wait for the transaction to be mined
        await publicClient!.waitForTransactionReceipt({ hash });

        await refetchSafeTxs();
        await refetchHistory();

        toast({
          title: 'You successfully executed the transaction.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        setExecutionTxnHash(null);
      },
    });
  };

  if (!hintData) {
    return (
      <Container p={24} textAlign="center">
        <Spinner />
      </Container>
    );
  }

  if (!safeTxn && isSafeTxsFetched) {
    return (
      <Container>
        <Text>
          Transaction not found! Current safe nonce:{' '}
          {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
          {(_.last(staged)?.txn._nonce || safeNonce).toString()}
        </Text>
      </Container>
    );
  }

  return (
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
                chainId={chainId}
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
        {/* Cannon file diff  */}
        {queuedWithGitOps && (
          <Card
            containerProps={{
              position: expandDiff ? 'fixed' : 'static',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
              mb: expandDiff ? 0 : 6,
              p: 4,
            }}
            contentProps={{
              h: '100%',
              overflowY: 'auto',
              maxH: expandDiff ? 'none' : '345px',
            }}
            title="Cannonfile Diff"
            titleExtraContent={
              <Link
                ml="auto"
                onClick={() => {
                  setExpandDiff(!expandDiff);
                }}
                textDecoration="none"
                _hover={{ textDecoration: 'none' }}
                display="flex"
                alignItems="center"
              >
                {expandDiff ? <IoIosContract /> : <IoIosExpand />}
                <Text
                  fontSize="xs"
                  display="inline"
                  borderBottom="1px solid"
                  borderBottomColor="gray.500"
                  ml="1.5"
                >
                  {expandDiff ? 'Collapse' : 'Expand'}
                </Text>
              </Link>
            }
          >
            <Box ref={gitDiffContainerRef} pb={expandDiff ? 6 : 0} />
          </Card>
        )}

        <Grid
          templateColumns={{ base: 'repeat(1, 1fr)', lg: 'auto 320px' }}
          gap={6}
        >
          {/* TX Info: left column */}
          <TransactionDisplay
            safe={safe}
            safeTxn={safeTxn as any}
            queuedWithGitOps={queuedWithGitOps}
            showQueueSource={true}
            isTransactionExecuted={isTransactionExecuted}
            containerRef={gitDiffContainerRef}
          />
          {/* Tx extra data: right column */}
          <Box position="relative">
            <Box position="sticky" top={8}>
              {/* Verify txs */}
              {!isTransactionExecuted && !unorderedNonce && (
                <Card title="Verify Transactions">
                  {queuedWithGitOps && (
                    <Box>
                      {buildInfo.buildMessage && (
                        <Text fontSize="sm" mb="2">
                          {buildInfo.buildMessage}
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
                    </Box>
                  )}
                  <SimulateTransactionButton
                    // signer is the one who queued the transaction
                    signer={signers[0]}
                    safe={safe}
                    safeTxn={safeTxn}
                    execTransactionData={stager.execTransactionData}
                  />
                </Card>
              )}

              {/* Signatures or Execute info  */}
              <Card
                title={executionTxnHash ? 'Execution' : 'Signatures'}
                subtitle={executionTxnHash ? 'Transaction pending' : undefined}
              >
                {executionTxnHash ? (
                  /* Execution */
                  <Link
                    href={getExplorerUrl(safeChain?.id, executionTxnHash)}
                    isExternal
                    fontSize="sm"
                    fontWeight="medium"
                    mt={3}
                  >
                    {truncateAddress((executionTxnHash || '') as string, 8)}
                    <ExternalLinkIcon transform="translateY(-1px)" ml={1} />
                  </Link>
                ) : (
                  /* Signatures */
                  <>
                    {/* Show signatures collected */}
                    {signers?.map((s) => (
                      <Box mt={2.5} key={s}>
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
                            href={getExplorerUrl(safeChain?.id, s)}
                            ml={1}
                          >
                            <ExternalLinkIcon transform="translateY(-1px)" />
                          </Link>
                        </Text>
                      </Box>
                    ))}

                    {!isTransactionExecuted && (
                      <>
                        {/* Required signatures to reach threshold */}
                        {remainingSignatures > 0 && (
                          <AdditionalSignaturesText
                            amount={remainingSignatures}
                          />
                        )}

                        {/* Warning if trying to sign a nonce bigger than the next to be executed */}
                        {unorderedNonce && (
                          <UnorderedNonceWarning
                            nextNonce={staged[0]?.txn._nonce}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {!isTransactionExecuted && !executionTxnHash && (
                  <Flex mt={4} gap={4}>
                    {account.isConnected && walletChainId === safe.chainId ? (
                      <>
                        <Tooltip label={stager.signConditionFailed}>
                          <CustomButton
                            mb={3}
                            isDisabled={
                              stager.signing ||
                              stager.alreadySigned ||
                              executionTxnHash ||
                              ((safeTxn && !!stager.signConditionFailed) as any)
                            }
                            onClick={async () => {
                              await stager.sign();
                            }}
                          >
                            {stager.signing ? (
                              <>
                                Signing
                                <Spinner size="sm" ml={2} />
                              </>
                            ) : (
                              'Sign'
                            )}
                          </CustomButton>
                        </Tooltip>
                        <Tooltip label={stager.execConditionFailed}>
                          <CustomButton
                            isDisabled={
                              stager.signing ||
                              !stager.executeTxnConfig ||
                              executionTxnHash ||
                              ((safeTxn && !!stager.execConditionFailed) as any)
                            }
                            onClick={handleExecuteTx}
                          >
                            Execute
                          </CustomButton>
                        </Tooltip>
                      </>
                    ) : (
                      <CustomButton onClick={handleConnectWalletAndSign}>
                        {account.isConnected
                          ? `Switch to chain  ${safe.chainId}`
                          : 'Connect wallet'}
                      </CustomButton>
                    )}
                  </Flex>
                )}
              </Card>

              {/* Cannon package IPFS Info */}
              {queuedWithGitOps && isTransactionExecuted && (
                <Card
                  title={
                    <>
                      Cannon Package
                      <Tooltip label="Packages include data about this deployment (including smart contract addresses, ABIs, and source code). When publishing, the registry collects some ETH (indicated as the 'value' for the transaction in your wallet) to support an IPFS cluster that pins package data.">
                        <InfoOutlineIcon ml={1.5} opacity={0.8} mt={-0.5} />
                      </Tooltip>
                    </>
                  }
                >
                  <PublishUtility
                    deployUrl={hintData.cannonPackage}
                    targetChainId={safe.chainId}
                  />
                </Card>
              )}
            </Box>
          </Box>
        </Grid>
      </Container>
    </Box>
  );
}

export default TransactionDetailsPage;
