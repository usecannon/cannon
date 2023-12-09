import { CheckIcon, ExternalLinkIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Heading,
  ListItem,
  OrderedList,
  Text,
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

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction;
  safe: SafeDefinition;
  verify?: boolean;
  allowPublishing?: boolean;
}) {
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
    return <Alert status="info">Parsing transaction data...</Alert>;
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

  return (
    <Box>
      {hintData.gitRepoUrl && (
        <Box mb="6">
          <Heading size="md" mb={1}>
            Git Target
          </Heading>
          {hintData.gitRepoUrl}@{hintData.gitRepoHash}
        </Box>
      )}

      <Box mb="8">
        {patches.map((p) => {
          if (!p) {
            return [];
          }

          try {
            const { oldRevision, newRevision, type, hunks } = parseDiff(p)[0];
            return (
              <Box
                bg="gray.900"
                borderRadius="sm"
                overflow="hidden"
                fontSize="xs"
                mb={4}
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
      </Box>
      <Box mb="6">
        <Heading size="md">Transactions</Heading>
        <Box maxW="100%" overflowX="scroll">
          {hintData.txns.map((txn, i) => (
            <DisplayedTransaction
              key={`tx-${i}`}
              contracts={cannonInfo.contracts as any}
              txn={txn}
            />
          ))}
        </Box>
      </Box>
      {props.verify && hintData.type === 'deploy' && (
        <Box mb="4">
          <Heading size="md" mb="3">
            Verify Queued Transactions
          </Heading>
          {buildInfo.buildStatus && (
            <Alert status="info">
              <strong>{buildInfo.buildStatus}</strong>
            </Alert>
          )}
          {buildInfo.buildError && (
            <Alert status="error">
              <strong>{buildInfo.buildError}</strong>
            </Alert>
          )}
          {buildInfo.buildResult && !unequalTransaction && (
            <Box
              display="inline-block"
              borderRadius="lg"
              bg="blackAlpha.300"
              px={4}
              py={3}
            >
              <Box
                backgroundColor="green"
                borderRadius="full"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                boxSize={5}
                mr={2.5}
              >
                <CheckIcon color="white" boxSize={2.5} />
              </Box>
              <Text fontWeight="bold" display="inline">
                The transactions queued to the Safe match the Git Target
              </Text>
            </Box>
          )}
          {buildInfo.buildResult && unequalTransaction && (
            <Text color="red" as="b">
              <WarningIcon />
              &nbsp;Proposed Transactions Do not Match Git Diff. Could be an
              attack.
            </Text>
          )}
          {prevDeployPackageUrl &&
            hintData.cannonUpgradeFromPackage !== prevDeployPackageUrl && (
              <Text color="orange">
                <WarningIcon />
                &nbsp;Previous Deploy Hash does not derive from on-chain record
              </Text>
            )}
        </Box>
      )}
      {props.verify ? (
        <Box mb={8}>
          <Button
            size="xs"
            as="a"
            mb={8}
            href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
              props.safe.address
            }&gas=${8000000}&gasPrice=0&value=${
              props.safeTxn?.value
            }&contractAddress=${
              props.safe?.address
            }&rawFunctionInput=${createSimulationData(props.safeTxn)}&network=${
              props.safe.chainId
            }&headerBlockNumber=&headerTimestamp=`}
            colorScheme="purple"
            rightIcon={<ExternalLinkIcon />}
            target="_blank"
            rel="noopener noreferrer"
          >
            Simulate on Tenderly
          </Button>
          <Heading size="md" mb="2">
            Signatures ({stager.existingSigners.length}/
            {Number(stager.requiredSigners)})
          </Heading>
          <OrderedList fontSize="lg">
            {stager.existingSigners.map((s, index) => (
              <ListItem key={index} mb={1}>
                {generateSignerLabel(s) && `(${generateSignerLabel(s)})`} {s}
              </ListItem>
            ))}
          </OrderedList>
        </Box>
      ) : (
        hintData.type === 'deploy' &&
        props.allowPublishing && (
          <Box>
            <Heading size="md" mb="1.5">
              Cannon Package
            </Heading>
            <PublishUtility
              deployUrl={hintData.cannonPackage}
              targetChainId={props.safe.chainId}
            />
          </Box>
        )
      )}
    </Box>
  );
}
