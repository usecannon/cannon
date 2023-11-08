'use client';

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Select,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { ChainBuilderContext } from '@usecannon/builder';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import {
  useChainId,
  useContractWrite,
  usePrepareSendTransaction,
  useSendTransaction,
} from 'wagmi';
import 'react-diff-view/style/index.css';
import { EditableAutocompleteInput } from '@/components/EditableAutocompleteInput';
import { links } from '@/constants/links';
import { useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useGitFilesList, useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { useStore } from '@/helpers/store';
import { makeMultisend } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import NoncePicker from './NoncePicker';
import { TransactionDisplay } from './TransactionDisplay';

export default function QueueFromGitOpsPage() {
  return <QueueFromGitOps />;
}

function QueueFromGitOps() {
  const currentSafe = useStore((s: any) => s.currentSafe);

  const prepareDeployOnchainStore = usePrepareSendTransaction(
    onchainStore.deployTxn as any
  );
  const deployOnChainStore = useSendTransaction({
    ...prepareDeployOnchainStore.config,
    onSuccess: () => {
      console.log('on success');
      void prepareDeployOnchainStore.refetch();
    },
  });

  const [gitUrl, setGitUrl] = useState('');
  const [gitFile, setGitFile] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const gitDir = gitFile.includes('/')
    ? gitFile.slice(gitFile.lastIndexOf('/'))[0]
    : '';

  const refsInfo = useGitRefsList(gitUrl);

  const router = useRouter();

  if (refsInfo.refs && !gitBranch) {
    const headCommit = refsInfo.refs.find((r) => r.ref === 'HEAD');
    const headBranch = refsInfo.refs.find(
      (r) => r.oid === headCommit?.oid && r !== headCommit
    );

    if (headBranch) {
      setGitBranch(headBranch.ref);
    }
  }

  const gitDirList = useGitFilesList(gitUrl, gitBranch, gitDir);

  const cannonDefInfo = useLoadCannonDefinition(gitUrl, gitBranch, gitFile);

  // TODO: is there any way to make a better ocntext? maybe this means we should get rid of name using context?
  const ctx: ChainBuilderContext = {
    chainId: 0,

    package: {},

    timestamp: '0',

    settings: {},

    contracts: {},

    txns: {},

    imports: {},

    extras: {},
  };

  const settings = useStore((s) => s.settings);
  const chainId = useChainId();

  const cannonPkgLatestInfo = useCannonPackage(
    (cannonDefInfo.def && `${cannonDefInfo.def.getName(ctx)}:latest`) ?? '',
    `${chainId}-${settings.preset}`
  );
  const cannonPkgVersionInfo = useCannonPackage(
    (cannonDefInfo.def &&
      `${cannonDefInfo.def.getName(ctx)}:${cannonDefInfo.def.getVersion(
        ctx
      )}`) ??
      '',
    `${chainId}-${settings.preset}`
  );

  const prevDeployLocation =
    (partialDeployIpfs ? 'ipfs://' + partialDeployIpfs : null) ||
    cannonPkgLatestInfo.pkgUrl ||
    cannonPkgVersionInfo.pkgUrl;

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation ? `@ipfs:${_.last(prevDeployLocation.split('/'))}` : ''
  );

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    currentSafe as any,
    cannonDefInfo.def as any,
    prevCannonDeployInfo.pkg as any,
    false
  );

  const buildTransactions = () => {
    buildInfo.doBuild();
  };

  const uploadToPublishIpfs = useCannonWriteDeployToIpfs(
    buildInfo.buildResult?.runtime as any,
    {
      def: cannonDefInfo.def?.toJson(),
      state: buildInfo.buildResult?.state,
      options: prevCannonDeployInfo.pkg?.options,
      meta: prevCannonDeployInfo.pkg?.meta,
      miscUrl: prevCannonDeployInfo.pkg?.miscUrl,
    } as any,
    prevCannonDeployInfo.metaUrl as any
  );

  useEffect(() => {
    if (buildInfo.buildResult) {
      uploadToPublishIpfs.writeToIpfsMutation.mutate();
    }
  }, [buildInfo.buildResult?.steps]);

  const gitHash = refsInfo.refs?.find((r) => r.ref === gitBranch)?.oid;

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitUrl + ':' + gitFile
  );

  console.log(' the prev info query data is', prevInfoQuery.data);

  const multicallTxn: /*Partial<TransactionRequestBase>*/ any =
    buildInfo.buildResult &&
    buildInfo.buildResult.steps.indexOf(null as any) === -1
      ? makeMultisend(
          [
            // supply the hint data
            {
              to: zeroAddress,
              data: encodeAbiParameters(
                [{ type: 'string[]' }],
                [
                  [
                    'deploy',
                    uploadToPublishIpfs.deployedIpfsHash,
                    prevDeployLocation || '',
                    `${gitUrl}:${gitFile}`,
                    gitHash,
                    prevInfoQuery.data &&
                    (prevInfoQuery.data[0].result as any).length > 2
                      ? ((prevInfoQuery.data[0].result as any).slice(2) as any)
                      : '',
                  ],
                ]
              ),
            } as Partial<TransactionRequestBase>,
            // write data needed for the subsequent deployment to chain
            {
              to: onchainStore.deployAddress,
              data: encodeFunctionData({
                abi: onchainStore.ABI,
                functionName: 'set',
                args: [
                  keccak256(toBytes(`${gitUrl}:${gitFile}gitHash`)),
                  '0x' + gitHash,
                ],
              }),
            } as Partial<TransactionRequestBase>,
            {
              to: onchainStore.deployAddress,
              data: encodeFunctionData({
                abi: onchainStore.ABI,
                functionName: 'set',
                args: [
                  keccak256(toBytes(`${gitUrl}:${gitFile}cannonPackage`)),
                  stringToHex(uploadToPublishIpfs.deployedIpfsHash ?? ''),
                ],
              }),
            } as Partial<TransactionRequestBase>,
          ].concat(
            buildInfo.buildResult.steps.map(
              (s) => s.tx as unknown as Partial<TransactionRequestBase>
            )
          )
        )
      : { value: BigInt(0) };

  let totalGas = BigInt(0);

  for (const step of buildInfo.buildResult?.steps || []) {
    totalGas += BigInt(step.gas.toString());
  }

  const toast = useToast();

  const stager = useTxnStager(
    (multicallTxn.data
      ? {
          to: multicallTxn.to,
          value: multicallTxn.value.toString(),
          data: multicallTxn.data,
          safeTxGas: totalGas.toString(),
          operation: '1', // delegate call multicall
          _nonce: pickedNonce,
        }
      : {}) as any,
    {
      onSignComplete() {
        console.log('signing is complete, redirect');
        router.push(links.DEPLOY);
        toast({
          title: 'You successfully signed the transaction.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const execTxn = useContractWrite(stager.executeTxnConfig);

  if (
    prepareDeployOnchainStore.isFetched &&
    !prepareDeployOnchainStore.isError
  ) {
    return (
      <Container maxWidth="container.sm">
        <Box
          bg="blackAlpha.600"
          border="1px solid"
          borderColor="gray.900"
          borderRadius="md"
          p={6}
          my={16}
        >
          <Text mb={4}>
            To use this tool, you need to deploy the on-chain store contract.
            This is a one time (per network) operation and will cost a small
            amount of gas.
          </Text>
          <Button
            colorScheme="teal"
            w="100%"
            onClick={() =>
              deployOnChainStore.sendTransaction &&
              deployOnChainStore.sendTransaction()
            }
          >
            Deploy On-Chain Store Contract
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="container.md" py={8}>
        <Box mb={6}>
          <Heading size="md" mb={2}>
            Queue Build
          </Heading>
          <Text fontSize="sm" color="gray.300">
            Queue transactions based on a pull request that modifies a
            cannonfile in a git repository. Optionally, you can provide partial
            build information. (This is especially useful for builds that
            involve contract deployments.) After the queued transactions are
            executed, a resulting package can be published to the registry.
          </Text>
        </Box>
        <FormControl mb="8">
          <FormLabel>GitOps Repository</FormLabel>
          <HStack>
            <Input
              type="text"
              placeholder="https://github.com/myorg/myrepo"
              value={gitUrl}
              borderColor="whiteAlpha.400"
              background="black"
              onChange={(evt: any) => setGitUrl(evt.target.value)}
            />
            {gitUrl.length && (
              <Flex height="40px">
                {gitDirList.readdirQuery.isLoading ? (
                  <Spinner my="auto" ml="2" />
                ) : (
                  <EditableAutocompleteInput
                    minWidth="220px"
                    editable
                    color={'white'}
                    placeholder="cannonfile.toml"
                    items={(gitDirList.contents || []).map((d: any) => ({
                      label: gitDir + d,
                      secondary: '',
                    }))}
                    onFilterChange={(v) => setGitFile(v)}
                    onChange={(v) => setGitFile(v)}
                  />
                )}
              </Flex>
            )}
          </HStack>
          <FormHelperText color="gray.300">
            Enter a Git URL and then select the Cannonfile that was modified in
            the branch chosen below.
          </FormHelperText>
        </FormControl>
        <FormControl mb="8">
          <FormLabel>Branch</FormLabel>
          <HStack>
            <Select
              borderColor="whiteAlpha.400"
              background="black"
              value={gitBranch}
              onChange={(evt: any) => setGitBranch(evt.target.value)}
            >
              {(refsInfo.refs?.filter((r) => r.ref !== 'HEAD') || []).map(
                (r, i) => (
                  <option key={i} value={r.ref}>
                    {r.ref}
                  </option>
                )
              )}
            </Select>
          </HStack>
        </FormControl>
        {/* TODO: insert/load override settings here */}
        <FormControl mb="8">
          <FormLabel>Partial Deployment Data (Optional)</FormLabel>
          <Input
            placeholder="Qm..."
            type="text"
            value={partialDeployIpfs}
            borderColor="whiteAlpha.400"
            background="black"
            onChange={
              (evt: any) =>
                setPartialDeployIpfs(
                  evt.target.value.slice(evt.target.value.indexOf('Qm'))
                ) /** TODO: handle bafy hash or other hashes */
            }
          />
          <FormHelperText color="gray.300">
            If this deployment requires transactions executed in other contexts
            (e.g. contract deployments or function calls using other signers),
            provide the IPFS hash generated from executing that partial
            deployment using the build command in the CLI.
          </FormHelperText>
        </FormControl>
        {buildInfo.buildStatus == '' && (
          <Button
            width="100%"
            colorScheme="teal"
            mb={6}
            isDisabled={
              cannonPkgVersionInfo.ipfsQuery.isFetching ||
              cannonPkgLatestInfo.ipfsQuery.isFetching ||
              cannonPkgVersionInfo.registryQuery.isFetching ||
              cannonPkgLatestInfo.registryQuery.isFetching
            }
            onClick={() => buildTransactions()}
          >
            Preview Transactions to Queue
          </Button>
        )}
        {buildInfo.buildStatus && (
          <Alert mb="6" status="info">
            <Spinner mr={3} boxSize={4} />
            <strong>{buildInfo.buildStatus}</strong>
          </Alert>
        )}
        {buildInfo.buildError && (
          <Alert mb="6" status="error">
            <AlertIcon mr={3} />
            <strong>{buildInfo.buildError}</strong>
          </Alert>
        )}
        {multicallTxn.data && stager.safeTxn && (
          <TransactionDisplay
            safe={currentSafe as any}
            safeTxn={stager.safeTxn}
          />
        )}

        {uploadToPublishIpfs.deployedIpfsHash && multicallTxn.data && (
          <Box my="6">
            <NoncePicker
              safe={currentSafe as any}
              onPickedNonce={setPickedNonce}
            />
            <HStack gap="6">
              {stager.execConditionFailed ? (
                <Tooltip label={stager.signConditionFailed}>
                  <Button
                    isDisabled={!!stager.signConditionFailed}
                    size="lg"
                    w="100%"
                    onClick={() => stager.sign()}
                  >
                    Queue &amp; Sign
                  </Button>
                </Tooltip>
              ) : null}
              <Tooltip label={stager.execConditionFailed}>
                <Button
                  isDisabled={!!stager.execConditionFailed}
                  size="lg"
                  w="100%"
                  onClick={async () => {
                    if (execTxn.writeAsync) {
                      await execTxn.writeAsync();
                      router.push(links.DEPLOY);
                      toast({
                        title: 'You successfully executed the transaction.',
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
          </Box>
        )}
      </Container>
    </>
  );
}
