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
  Link,
  Code,
  Spinner,
  Text,
  Tooltip,
  useToast,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { ChainBuilderContext } from '@usecannon/builder';
import _ from 'lodash';
import { useEffect, useMemo, useState } from 'react';
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
import { links } from '@/constants/links';
import { useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { useStore } from '@/helpers/store';
import { makeMultisend } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import NoncePicker from './NoncePicker';
import { TransactionDisplay } from './TransactionDisplay';
import NextLink from 'next/link';
import { CheckIcon } from '@chakra-ui/icons';

export default function QueueFromGitOpsPage() {
  return <QueueFromGitOps />;
}

function QueueFromGitOps() {
  const router = useRouter();
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

  const [cannonfileUrlInput, setCannonfileUrlInput] = useState('');
  const [previousPackageInput, setPreviousPackageInput] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const cannonfileUrlRegex =
    // eslint-disable-next-line no-useless-escape
    /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?\.toml$/i;

  const gitUrl = useMemo(() => {
    if (!cannonfileUrlRegex.test(cannonfileUrlInput)) {
      return '';
    }

    if (!cannonfileUrlInput.includes('/blob/')) {
      return '';
    }

    return cannonfileUrlInput.split('/blob/')[0];
  }, [cannonfileUrlInput]);

  const gitBranch = useMemo(() => {
    if (!cannonfileUrlRegex.test(cannonfileUrlInput)) {
      return '';
    }

    if (!cannonfileUrlInput.includes('/blob/')) {
      return '';
    }

    const branchAndFile = cannonfileUrlInput.split('/blob/')[1];
    if (!branchAndFile) {
      return '';
    }

    const branchName = branchAndFile.split('/')[0];
    if (!branchName) {
      return '';
    }

    return `refs/heads/${branchName}`;
  }, [cannonfileUrlInput]);

  const gitFile = useMemo(() => {
    if (!cannonfileUrlRegex.test(cannonfileUrlInput)) {
      return '';
    }

    if (!cannonfileUrlInput.includes('/blob/')) {
      return '';
    }

    const branchAndFile = cannonfileUrlInput.split('/blob/')[1];
    if (!branchAndFile) {
      return '';
    }

    const urlComponents = branchAndFile.split('/');
    urlComponents.shift();
    return urlComponents.join('/');
  }, [cannonfileUrlInput]);

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

  const previousName = useMemo(() => {
    if (previousPackageInput) {
      return previousPackageInput.split(':')[0];
    }

    if (cannonDefInfo.def) {
      return cannonDefInfo.def.getName(ctx);
    }

    return '';
  }, [previousPackageInput, cannonDefInfo.def]);

  const previousVersion = useMemo(() => {
    if (previousPackageInput) {
      return previousPackageInput.split('@')[0]?.split(':')[1];
    }

    return 'latest';
  }, [previousPackageInput]);

  const previousPreset = useMemo(() => {
    if (previousPackageInput) {
      return previousPackageInput.split('@')[1];
    }

    return 'main';
  }, [previousPackageInput]);

  const cannonPkgPreviousInfo = useCannonPackage(
    (cannonDefInfo.def &&
      `${previousName}:${previousVersion}${
        previousPreset ? '@' + previousPreset : ''
      }`) ??
      '',
    chainId
  );
  const preset = cannonDefInfo.def && cannonDefInfo.def.getPreset(ctx);
  const cannonPkgVersionInfo = useCannonPackage(
    (cannonDefInfo.def &&
      `${cannonDefInfo.def.getName(ctx)}:${cannonDefInfo.def.getVersion(ctx)}${
        preset ? '@' + preset : ''
      }`) ??
      '',
    chainId
  );

  const prevDeployLocation =
    (partialDeployIpfs ? 'ipfs://' + partialDeployIpfs : null) ||
    cannonPkgPreviousInfo.pkgUrl ||
    cannonPkgVersionInfo.pkgUrl;

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation ? `@ipfs:${_.last(prevDeployLocation.split('/'))}` : ''
  );

  const partialDeployInfo = useCannonPackage(
    partialDeployIpfs ? '@ipfs:' + partialDeployIpfs : ''
  );

  useEffect(() => {
    if (cannonDefInfo.def) {
      if (partialDeployInfo.pkg) {
        setPreviousPackageInput(
          `${partialDeployInfo.resolvedName}:${
            partialDeployInfo.resolvedVersion
          }${
            partialDeployInfo.resolvedPreset
              ? '@' + partialDeployInfo.resolvedPreset
              : ''
          }`
        );
      } else {
        const name = cannonDefInfo.def.getName(ctx);
        const version = 'latest';
        const preset = 'main';
        setPreviousPackageInput(`${name}:${version}@${preset}`);
      }
    } else {
      setPreviousPackageInput('');
    }
  }, [cannonDefInfo.def, partialDeployInfo.pkg]);

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    currentSafe as any,
    cannonDefInfo.def as any,
    prevCannonDeployInfo.pkg as any
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

  const refsInfo = useGitRefsList(gitUrl);
  const gitHash = refsInfo.refs?.find((r) => r.ref === gitBranch)?.oid;

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitUrl + ':' + gitFile
  );

  console.log('the prev info query data is', prevInfoQuery.data);

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
      safe: currentSafe,
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

  const isPartialDataRequired =
    buildInfo.buildSkippedSteps.filter(
      (s) => s.name.includes('contract') || s.name.includes('router')
    ).length > 0;

  let alertMessage;
  if (chainId !== currentSafe.chainId) {
    alertMessage =
      'Your wallet must be connected to the same network as the selected Safe.';
  } else if (settings.isIpfsGateway) {
    alertMessage = (
      <>
        Update your IPFS URL to an API endpoint where you can pin files in{' '}
        <Link href="/settings">settings</Link>.
      </>
    );
  } else if (settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
    alertMessage = (
      <>
        Update your IPFS URL to an API endpoint where you can pin files in{' '}
        <Link href="/settings">settings</Link>.
      </>
    );
  }

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
          <Heading size="lg" mb={2}>
            Queue Cannonfile
          </Heading>
          <Text color="gray.300">
            Queue transactions from a cannonfile in a git repository. After the
            transactions are executed, the resulting package can be published to
            the registry.
          </Text>
        </Box>

        <Box
          mb={8}
          p={6}
          bg="gray.800"
          display="block"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="gray.600"
          borderRadius="4px"
        >
          <FormControl mb="6">
            <FormLabel>Cannonfile</FormLabel>
            <HStack>
              <InputGroup>
                <Input
                  type="text"
                  placeholder="https://github.com/myorg/myrepo/blob/main/cannonfile.toml"
                  value={cannonfileUrlInput}
                  borderColor={
                    !cannonfileUrlInput.length ||
                    cannonDefInfo.isFetching ||
                    cannonDefInfo.def
                      ? 'whiteAlpha.400'
                      : 'red.500'
                  }
                  background="black"
                  onChange={(evt: any) =>
                    setCannonfileUrlInput(evt.target.value)
                  }
                />
                <InputRightElement>
                  {cannonDefInfo.isFetching && <Spinner />}
                  {cannonDefInfo.def && <CheckIcon color="green.500" />}
                </InputRightElement>
              </InputGroup>
            </HStack>
            <FormHelperText color="gray.300">
              Enter a Git or GitHub URL for the cannonfile you’d like to build.
            </FormHelperText>
          </FormControl>

          <FormControl mb="6">
            <FormLabel>Previous Package</FormLabel>
            <InputGroup>
              <Input
                placeholder="name:version@preset"
                type="text"
                value={previousPackageInput}
                borderColor={
                  !previousPackageInput.length ||
                  cannonPkgPreviousInfo.isFetching ||
                  cannonPkgPreviousInfo.pkg
                    ? 'whiteAlpha.400'
                    : 'red.500'
                }
                background="black"
                onChange={(evt: any) =>
                  setPreviousPackageInput(evt.target.value)
                }
                disabled={!!partialDeployInfo.pkg}
              />
              <InputRightElement>
                {cannonPkgPreviousInfo.isFetching && <Spinner />}
                {cannonPkgPreviousInfo.pkg && <CheckIcon color="green.500" />}
              </InputRightElement>
            </InputGroup>
            <FormHelperText color="gray.300">
              <strong>Optional.</strong> Specify the package this cannonfile is
              extending. See{' '}
              <Link as={NextLink} href="/learn/cli#build">
                <Code>--upgrade-from</Code>
              </Link>
            </FormHelperText>
          </FormControl>
          {/* TODO: insert/load override settings here */}
          <FormControl mb="6">
            <FormLabel>Partial Deployment Data</FormLabel>
            <InputGroup>
              <Input
                placeholder="Qm..."
                type="text"
                value={partialDeployIpfs}
                borderColor={
                  !partialDeployIpfs.length ||
                  partialDeployInfo.isFetching ||
                  partialDeployInfo.pkg
                    ? 'whiteAlpha.400'
                    : 'red.500'
                }
                background="black"
                onChange={
                  (evt: any) =>
                    setPartialDeployIpfs(
                      evt.target.value.slice(evt.target.value.indexOf('Qm'))
                    ) /** TODO: handle bafy hash or other hashes */
                }
              />
              <InputRightElement>
                {partialDeployInfo.isFetching && <Spinner />}
                {partialDeployInfo.pkg && <CheckIcon color="green.500" />}
              </InputRightElement>
            </InputGroup>
            <FormHelperText color="gray.300">
              <strong>Optional.</strong> If this deployment requires
              transactions executed in other contexts (e.g. contract deployments
              or function calls using other signers), provide the IPFS hash
              generated from executing that partial deployment using the build
              command in the CLI.
            </FormHelperText>
          </FormControl>
          {alertMessage && (
            <Alert mb="6" status="warning" bg="gray.700">
              <AlertIcon mr={3} />
              <Text>{alertMessage}</Text>
            </Alert>
          )}
          <Button
            width="100%"
            colorScheme="teal"
            isDisabled={
              chainId !== currentSafe.chainId ||
              settings.isIpfsGateway ||
              settings.ipfsApiUrl.includes('https://repo.usecannon.com') ||
              !cannonDefInfo.def ||
              cannonPkgPreviousInfo.isFetching ||
              cannonPkgVersionInfo.isFetching
            }
            onClick={() => buildTransactions()}
          >
            Preview Transactions to Queue
          </Button>
          {buildInfo.buildStatus && (
            <Alert mt="6" status="info" bg="gray.800">
              <Spinner mr={3} boxSize={4} />
              <strong>{buildInfo.buildStatus}</strong>
            </Alert>
          )}
          {buildInfo.buildError && (
            <Alert mt="6" status="error" bg="red.700">
              <AlertIcon mr={3} />
              <strong>{buildInfo.buildError}</strong>
            </Alert>
          )}
          {buildInfo.buildSkippedSteps.length > 0 && (
            <Flex flexDir="column" mt="6">
              <strong>
                This safe will not be able to complete the following steps:
              </strong>
              {buildInfo.buildSkippedSteps.map((s, i) => (
                <strong key={i}>{`${s.name}: ${s.err.toString()}`}</strong>
              ))}
            </Flex>
          )}
          {isPartialDataRequired && (
            <Alert mt="6" status="error" bg="red.700">
              <AlertIcon mr={3} />
              <Flex flexDir="column" gap={5}>
                <strong>
                  The web deployer is unable to compile and deploy contracts and
                  routers. Run the following command to generate partial deploy
                  data:
                </strong>
                <Code display="block">
                  {`cannon build ${gitFile} --upgrade-from ${previousPackageInput} --chain-id ${currentSafe.chainId}`}
                </Code>
              </Flex>
            </Alert>
          )}
          {!isPartialDataRequired && multicallTxn.data && stager.safeTxn && (
            <Box mt="8">
              <Heading size="md" mb={2}>
                Transactions
              </Heading>
              <TransactionDisplay
                safe={currentSafe as any}
                safeTxn={stager.safeTxn}
              />
            </Box>
          )}

          {uploadToPublishIpfs.writeToIpfsMutation.isLoading && (
            <Text>Uploading build result to IPFS...</Text>
          )}
          {uploadToPublishIpfs.writeToIpfsMutation.error && (
            <Text>
              Failed to upload staged transaction to IPFS:{' '}
              {uploadToPublishIpfs.writeToIpfsMutation.error.toString()}
            </Text>
          )}
          {uploadToPublishIpfs.deployedIpfsHash && multicallTxn.data && (
            <Box>
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
        </Box>
      </Container>
    </>
  );
}
