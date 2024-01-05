import { CheckIcon, ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  Link,
  useDisclosure,
  AlertDescription,
  AlertTitle,
  Alert as ChakraAlert,
  Grid,
} from '@chakra-ui/react';
import _ from 'lodash';
import { Diff, parseDiff } from 'react-diff-view';
import { hexToString, TransactionRequestBase } from 'viem';
import { useAccount } from 'wagmi';
import { useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useCannonPackageContracts,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useGitDiff } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { parseHintedMulticall } from '@/helpers/cannon';
import { createSimulationData } from '@/helpers/safe';
import { Alert } from '@/components/Alert';
import { DisplayedTransaction } from './DisplayedTransaction';
import PublishUtility from './PublishUtility';
import { useEffect } from 'react';
import { CustomSpinner } from '@/components/CustomSpinner';
import { GitHub } from 'react-feather';
import * as Chains from 'wagmi/chains';

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction;
  safe: SafeDefinition;
  verify?: boolean;
  allowPublishing?: boolean;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const account = useAccount();

  const hintData = parseHintedMulticall(props.safeTxn?.data);

  const cannonInfo = useCannonPackageContracts(
    hintData?.cannonPackage
      ? '@' + hintData.cannonPackage.replace('://', ':')
      : ''
  );

  // git stuff
  const denom = hintData?.gitRepoUrl?.lastIndexOf(':');
  const gitUrl = hintData?.gitRepoUrl?.slice(0, denom);
  const gitFile = hintData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  const prevDeployHashQuery = useGetPreviousGitInfoQuery(
    props.safe,
    hintData?.gitRepoUrl ?? ''
  );

  let prevDeployGitHash: string;
  if (props.allowPublishing) {
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

  const { patches } = useGitDiff(
    gitUrl ?? '',
    prevDeployGitHash,
    hintData?.gitRepoHash ?? '',
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  );

  const buildInfo = useCannonBuild(
    props.safe,
    cannonDefInfo.def as any,
    prevCannonDeployInfo.pkg as any
  );

  useEffect(
    () => buildInfo.doBuild(),
    [
      props.verify &&
        (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
    ]
  );

  const stager = useTxnStager(props.safeTxn, { safe: props.safe });

  if (hintData?.cannonPackage && !cannonInfo.contracts) {
    return (
      <Box
        py="20"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
      >
        <CustomSpinner mx="auto" mb="2" />
        <Text fontSize="sm" color="gray.400">
          Parsing transaction data...
        </Text>
      </Box>
    );
  }

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

  const parseDiffFileNames = (diffString: string): string[] => {
    const regExp = /[-|+]{3}\s[ab]\/\.(.*?)\n/g;
    let match;
    const fileNames: string[] = [];
    while ((match = regExp.exec(diffString)) !== null) {
      fileNames.push(match[1]);
    }
    return fileNames;
  };

  function generateSignerLabel(s: string) {
    if (s === account.address) {
      return 'you';
    }

    return null;
  }

  if (!hintData) {
    return <Alert status="info">Could not parse the transaction.</Alert>;
  }

  const remainingSignatures =
    Number(stager.requiredSigners) - stager.existingSigners.length;
  const signers = props.verify
    ? stager.existingSigners
    : props.safeTxn?.confirmedSigners;
  const etherscanUrl =
    (
      Object.values(Chains).find(
        (chain) => chain.id === props.safe.chainId
      ) as any
    )?.blockExplorers?.etherscan?.url ?? 'https://etherscan.io';

  return (
    <Grid templateColumns={{ base: 'repeat(1, 1fr)', lg: '2fr 1fr' }} gap={8}>
      <Box>
        {props.allowPublishing && (
          <>
            <ChakraAlert
              bg="gray.800"
              border="1px solid"
              borderColor="gray.700"
              mb={8}
            >
              <GitHub strokeWidth={1.5} />
              <Box ml={2.5}>
                <AlertTitle lineHeight={1} fontSize="sm" mb={1.5}>
                  GitOps Deployment
                </AlertTitle>
                <AlertDescription display="block" lineHeight={1} fontSize="sm">
                  These transactions were generated by{' '}
                  <Link onClick={onOpen}>
                    modifying{' '}
                    {Array.from(cannonDefInfo?.filesList || [])?.length}{' '}
                    cannonfiles
                  </Link>{' '}
                  in{' '}
                  <Link isExternal href={gitUrl}>
                    this repository
                  </Link>
                  .
                </AlertDescription>
              </Box>
            </ChakraAlert>

            <Modal size="full" isOpen={isOpen} onClose={onClose}>
              <ModalOverlay />
              <ModalContent background="gray.900">
                <ModalCloseButton />
                <ModalBody>
                  <Flex>
                    <Box w="50%" px={2} py={1} fontWeight="semibold">
                      {prevDeployGitHash}
                    </Box>
                    <Box w="50%" px={2} py={1} fontWeight="semibold">
                      {hintData?.gitRepoHash}
                    </Box>
                  </Flex>
                  {patches.map((p) => {
                    if (!p) {
                      return [];
                    }

                    try {
                      const { oldRevision, newRevision, type, hunks } =
                        parseDiff(p)[0];
                      return (
                        <Box
                          bg="gray.900"
                          borderRadius="sm"
                          overflow="hidden"
                          fontSize="xs"
                          mb={2}
                        >
                          <Flex
                            bg="blackAlpha.300"
                            direction="row"
                            py="1"
                            fontWeight="semibold"
                          >
                            <Box w="50%" px={2} py={1}>
                              {parseDiffFileNames(p)[0]}
                            </Box>
                            <Box w="50%" px={2} py={1}>
                              {parseDiffFileNames(p)[1]}
                            </Box>
                          </Flex>
                          <Diff
                            key={oldRevision + '-' + newRevision}
                            viewType="split"
                            diffType={type}
                            hunks={hunks}
                          />
                        </Box>
                      );
                    } catch (err) {
                      console.debug('diff didnt work:', err);

                      return [];
                    }
                  })}
                </ModalBody>
              </ModalContent>
            </Modal>
          </>
        )}

        <Box maxW="100%" overflowX="scroll">
          {hintData.txns.map((txn, i) => (
            <Box key={`tx-${i}`} mb={8}>
              <DisplayedTransaction
                contracts={cannonInfo.contracts as any}
                txn={txn}
              />
            </Box>
          ))}
        </Box>
      </Box>
      <Box position="relative">
        <Box position="sticky" top={8}>
          {props.verify && hintData.type === 'deploy' && (
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
                  The transactions queued to the Safe match the Git Target
                </Text>
              )}
              {buildInfo.buildResult && unequalTransaction && (
                <Text fontSize="sm" mb="2">
                  <WarningIcon />
                  &nbsp;Proposed Transactions Do not Match Git Diff. Could be an
                  attack.
                </Text>
              )}
              {prevDeployPackageUrl &&
                hintData.cannonUpgradeFromPackage !== prevDeployPackageUrl && (
                  <Text fontSize="sm" mb="2">
                    <WarningIcon />
                    &nbsp;Previous Deploy Hash does not derive from on-chain
                    record
                  </Text>
                )}
              <Button
                size="xs"
                as="a"
                href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
                  props.safe.address
                }&gas=${8000000}&gasPrice=0&value=${
                  props.safeTxn?.value
                }&contractAddress=${
                  props.safe?.address
                }&rawFunctionInput=${createSimulationData(
                  props.safeTxn
                )}&network=${
                  props.safe.chainId
                }&headerBlockNumber=&headerTimestamp=`}
                colorScheme="purple"
                rightIcon={<ExternalLinkIcon />}
                target="_blank"
                rel="noopener noreferrer"
              >
                Simulate on Tenderly
              </Button>
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

            {props.verify && remainingSignatures > 0 && (
              <Text mt="2">
                {remainingSignatures} more{' '}
                {remainingSignatures === 1 ? 'signature' : 'signatures'}{' '}
                required.
              </Text>
            )}
          </Box>
        </Box>

        {props.allowPublishing && (
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
              targetChainId={props.safe.chainId}
            />
          </Box>
        )}
      </Box>
    </Grid>
  );
}
