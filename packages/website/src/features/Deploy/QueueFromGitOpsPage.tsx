'use client';

import { links } from '@/constants/links';
import { parseIpfsHash } from '@/helpers/ipfs';
import { makeMultisend } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useDeployerWallet } from '@/hooks/deployer';
import {
  useCannonBuild,
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useLoadCannonDefinition,
  useCannonFindUpgradeFromUrl,
} from '@/hooks/cannon';
import { useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Code,
  Container,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Spinner,
  Text,
  Tooltip,
  useToast,
  VStack,
  Radio,
  RadioGroup,
  Stack,
  Checkbox,
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChainBuilderContext } from '@usecannon/builder';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import pkg from '../../../package.json';
import NoncePicker from './NoncePicker';
import { TransactionDisplay } from './TransactionDisplay';
import 'react-diff-view/style/index.css';
import { ChainDefinition } from '@usecannon/builder/dist/src';

const EMPTY_IPFS_MISC_URL =
  'ipfs://QmeSt2mnJKE8qmRhLyYbHQQxDKpsFbcWnw5e7JF4xVbN6k';

export default function QueueFromGitOpsPage() {
  return <QueueFromGitOps />;
}

function QueueFromGitOps() {
  const [selectedDeployType, setSelectedDeployType] = useState('new');
  const [overridePreviousState, setOverridePreviousState] = useState(false);
  const router = useRouter();
  const currentSafe = useStore((s) => s.currentSafe)!;
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [cannonfileUrlInput, setCannonfileUrlInput] = useState('');
  const [previousPackageInput, setPreviousPackageInput] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);
  const { openConnectModal } = useConnectModal();

  const deployer = useDeployerWallet(currentSafe?.chainId);

  const deployerWalletAddress = deployer.address;

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

  const gitRef = useMemo(() => {
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

    return branchName;
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

  let cannonDefInfo = useLoadCannonDefinition(gitUrl, gitRef, gitFile);

  const cannonDefInfoError: string = gitUrl
    ? (cannonDefInfo.error as any)?.toString()
    : cannonfileUrlInput &&
      'The format of your URL appears incorrect. Please double check and try again.';

  const partialDeployInfo = useCannonPackage(
    partialDeployIpfs ? `ipfs://${partialDeployIpfs}` : ''
  );

  // If its a partial deployment, create the chain definition from the
  // IPFS partial deployment data
  if (partialDeployInfo.pkg) {
    cannonDefInfo = {
      ...cannonDefInfo,
      isLoading: partialDeployInfo.isLoading,
      isFetching: partialDeployInfo.isFetching,
      isError: partialDeployInfo.isError,
      error: partialDeployInfo.error,
      def: new ChainDefinition(partialDeployInfo.pkg.def),
    };
  }

  // TODO: is there any way to make a better context? maybe this means we should get rid of name using context?
  const ctx: ChainBuilderContext = {
    chainId: 0,
    package: {},
    timestamp: '0',
    settings: {},
    contracts: {},
    txns: {},
    imports: {},
    overrideSettings: {},
  };

  const settings = useStore((s) => s.settings);

  const fullPackageRef = cannonDefInfo.def?.getPackageRef(ctx) ?? null;

  const onChainPrevPkgQuery = useCannonFindUpgradeFromUrl(
    fullPackageRef || undefined,
    chainId,
    cannonDefInfo.def?.getDeployers()
  );

  const prevDeployLocation = partialDeployIpfs
    ? `ipfs://${partialDeployIpfs}`
    : onChainPrevPkgQuery.url || '';

  const prevCannonDeployInfo = useCannonPackage(prevDeployLocation);

  useEffect(() => {
    if (!cannonDefInfo.def) return setPreviousPackageInput('');

    const name = cannonDefInfo.def.getName(ctx);
    const version = 'latest';
    const preset = cannonDefInfo.def.getPreset(ctx);
    setPreviousPackageInput(`${name}:${version}@${preset}`);
    if (selectedDeployType == 'new') setSelectedDeployType('upgrade');
  }, [cannonDefInfo.def, ctx, selectedDeployType]);

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    currentSafe,
    cannonDefInfo.def,
    prevCannonDeployInfo.pkg
  );

  useEffect(() => {
    buildInfo.reset();
  }, [deployerWalletAddress, buildInfo]);

  const uploadToPublishIpfs = useCannonWriteDeployToIpfs(
    buildInfo.buildResult?.runtime,
    cannonDefInfo.def
      ? {
          generator: `cannon website ${pkg.version}`,
          timestamp: Math.floor(Date.now() / 1000),
          def: cannonDefInfo.def.toJson(),
          state: buildInfo.buildResult?.state || {},
          options: prevCannonDeployInfo.pkg?.options || {},
          meta: prevCannonDeployInfo.pkg?.meta,
          miscUrl: prevCannonDeployInfo.pkg?.miscUrl || EMPTY_IPFS_MISC_URL,
          chainId: currentSafe.chainId,
        }
      : undefined,
    prevCannonDeployInfo.metaUrl
  );

  useEffect(() => {
    if (['success', 'error'].includes(buildInfo.buildStatus)) {
      uploadToPublishIpfs.writeToIpfsMutation.mutate();
    }
  }, [buildInfo.buildStatus, uploadToPublishIpfs.writeToIpfsMutation]);

  const refsInfo = useGitRefsList(gitUrl);
  const foundRef = refsInfo.refs?.find(
    (r) =>
      (r.ref.startsWith('refs/heads/') || r.ref.startsWith('refs/tags/')) &&
      r.ref.endsWith(gitRef)
  )?.oid;
  const gitHash = gitRef.match(/^[0-9a-f]+$/) ? foundRef || gitRef : foundRef;

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitUrl + ':' + gitFile
  );

  const multicallTxn: /*Partial<TransactionRequestBase>*/ any =
    buildInfo.buildResult &&
    !prevInfoQuery.isLoading &&
    buildInfo.buildResult.safeSteps.indexOf(null as any) === -1
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
                    gitUrl && gitFile ? `${gitUrl}:${gitFile}` : '',
                    gitHash || '',
                    prevInfoQuery.data &&
                    typeof prevInfoQuery.data?.[0].result == 'string' &&
                    (prevInfoQuery.data[0].result as any).length > 2
                      ? ((prevInfoQuery.data[0].result as any).slice(2) as any)
                      : '',
                  ],
                ]
              ),
            } as Partial<TransactionRequestBase>,
            // write data needed for the subsequent deployment to chain
            gitUrl && gitFile
              ? ({
                  to: onchainStore.deployAddress,
                  data: encodeFunctionData({
                    abi: onchainStore.ABI,
                    functionName: 'set',
                    args: [
                      keccak256(toBytes(`${gitUrl}:${gitFile}gitHash`)),
                      '0x' + gitHash,
                    ],
                  }),
                } as Partial<TransactionRequestBase>)
              : {},
            gitUrl && gitFile
              ? ({
                  to: onchainStore.deployAddress,
                  data: encodeFunctionData({
                    abi: onchainStore.ABI,
                    functionName: 'set',
                    args: [
                      keccak256(toBytes(`${gitUrl}:${gitFile}cannonPackage`)),
                      stringToHex(uploadToPublishIpfs.deployedIpfsHash ?? ''),
                    ],
                  }),
                } as Partial<TransactionRequestBase>)
              : {},
            {
              to: onchainStore.deployAddress,
              data: encodeFunctionData({
                abi: onchainStore.ABI,
                functionName: 'set',
                args: [
                  keccak256(
                    toBytes(
                      cannonDefInfo.def
                        ? `${cannonDefInfo.def.getName(
                            ctx
                          )}@${cannonDefInfo.def.getPreset(ctx)}`
                        : ''
                    )
                  ),
                  // TODO: we would really rather have the timestamp be when the txn was executed. something to fix when we have a new state contract
                  stringToHex(
                    `${Math.floor(Date.now() / 1000)}_${
                      uploadToPublishIpfs.deployedIpfsHash ?? ''
                    }`
                  ),
                ],
              }),
            } as Partial<TransactionRequestBase>,
          ].concat(
            buildInfo.buildResult.safeSteps.map(
              (s) => s.tx as unknown as Partial<TransactionRequestBase>
            )
          )
        )
      : { value: BigInt(0) };

  let totalGas = BigInt(0);

  for (const step of buildInfo.buildResult?.safeSteps || []) {
    totalGas += BigInt(step.gas.toString());
  }

  const toast = useToast();

  const stager = useTxnStager(
    multicallTxn.data
      ? ({
          to: multicallTxn.to,
          value: multicallTxn.value.toString(),
          data: multicallTxn.data,
          safeTxGas: totalGas.toString(),
          operation: '1', // delegate call multicall
          _nonce: pickedNonce,
        } as SafeTransaction)
      : {},
    {
      safe: currentSafe,
      async onSignComplete() {
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

  const execTxn = useWriteContract();

  const isOutsideSafeTxnsRequired =
    (buildInfo.buildResult?.deployerSteps.length || 0) > 0 &&
    !deployer.isComplete;

  const loadingDataForDeploy =
    prevCannonDeployInfo.isFetching ||
    partialDeployInfo.isFetching ||
    onChainPrevPkgQuery.isFetching ||
    buildInfo.buildStatus === 'building';

  const handlePreviewTxnsClick = async () => {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }
      toast({
        title:
          'In order to queue transactions, you must connect your wallet first.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (chainId !== currentSafe?.chainId) {
      try {
        await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
        buildInfo.doBuild();
        return;
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

    buildInfo.doBuild();
  };

  const renderAlertMessage = () => {
    let alertMessage: React.ReactNode;

    if (settings.isIpfsGateway) {
      alertMessage = (
        <>
          Your current IPFS URL is set to a gateway. Update your IPFS URL to an
          API endpoint where you can pin files in.
          <Link href="/settings">settings</Link>.
        </>
      );
    }

    if (cannonDefInfo.def && cannonDefInfo.def.danglingDependencies.size > 0) {
      alertMessage = (
        <>
          The cannonfile contains invalid dependencies. Please ensure the
          following references are defined:
          {Array.from(cannonDefInfo.def.danglingDependencies).map(
            ([input, node]) => (
              <Text key={`${input}:${node}`} as="span" fontFamily="monospace">
                {input} in {node}
              </Text>
            )
          )}
        </>
      );
    }

    return alertMessage ? (
      <VStack mt="6" spacing={2} mb={6}>
        <Alert status="error" bg="gray.700">
          <AlertIcon mr={3} />
          {alertMessage}
        </Alert>
      </VStack>
    ) : null;
  };

  const disablePreviewButton =
    loadingDataForDeploy ||
    chainId !== currentSafe?.chainId ||
    !cannonDefInfo.def ||
    buildInfo.buildStatus === 'building';

  function PreviewButton(props: any) {
    return (
      <Tooltip label={props.message}>
        <Button
          width="100%"
          colorScheme="teal"
          isDisabled={disablePreviewButton}
          onClick={handlePreviewTxnsClick}
        >
          {loadingDataForDeploy ? (
            <>
              Loading required data <Spinner size="sm" ml={2} />
            </>
          ) : (
            'Preview Transactions to Queue'
          )}
        </Button>
      </Tooltip>
    );
  }

  function renderCannonfileInput() {
    return (
      <FormControl mb="4">
        <FormLabel>
          Cannonfile {selectedDeployType == 'partial' ? '(Optional)' : ''}
        </FormLabel>
        <HStack>
          <InputGroup>
            <Input
              type="text"
              placeholder="https://github.com/myorg/myrepo/blob/main/cannonfile.toml"
              value={cannonfileUrlInput}
              borderColor={!cannonDefInfoError ? 'whiteAlpha.400' : 'red.500'}
              isDisabled={selectedDeployType == 'partial' && !partialDeployIpfs}
              background="black"
              onChange={(evt: any) => setCannonfileUrlInput(evt.target.value)}
            />
            <InputRightElement>
              {cannonDefInfo.isFetching ? (
                <Spinner />
              ) : cannonDefInfo.def ? (
                <CheckIcon color="green.500" />
              ) : null}
            </InputRightElement>
          </InputGroup>
        </HStack>
        <FormHelperText color="gray.300">
          Enter a Git or GitHub URL for the cannonfile you’d like to build.
        </FormHelperText>
        {cannonDefInfoError ? (
          <Alert mt="6" status="error" bg="gray.700">
            <AlertIcon mr={3} />
            <strong>{cannonDefInfoError.toString()}</strong>
          </Alert>
        ) : undefined}
      </FormControl>
    );
  }

  function RenderPreviewButtonTooltip() {
    if (!chainId) {
      return (
        <PreviewButton message="You must connect your wallet to the same chain as the selected safe to continue" />
      );
    }

    if (chainId !== currentSafe?.chainId) {
      return (
        <PreviewButton message="Deployment Chain ID does not match Safe Chain ID" />
      );
    }

    if (partialDeployInfo.isError) {
      const message = `Error fetching partial deploy info, error: ${partialDeployInfo.error?.message}`;
      return <PreviewButton message={message} />;
    }

    if (
      prevCannonDeployInfo.isFetching ||
      onChainPrevPkgQuery.isFetching ||
      partialDeployInfo.isFetching
    ) {
      return <PreviewButton message="Fetching package info, please wait..." />;
    }

    if (buildInfo.buildStatus === 'building') {
      return <PreviewButton message="Generating build info, please wait..." />;
    }

    if (!cannonDefInfo.def) {
      return (
        <PreviewButton message="No cannonfile definition found, please input the link to the cannonfile to build" />
      );
    }

    return <PreviewButton />;
  }

  // eslint-disable-next-line no-console

  return (
    <>
      <Container maxWidth="container.md" py={8}>
        <Box mb={6}>
          <Heading size="lg" mb={2}>
            Queue Deployment
          </Heading>
          <Text color="gray.300">
            Queue deployments from a cannonfile in a git repository or a partial
            deployment ipfs hash. After the transactions are executed, the
            resulting package can be published to the registry.
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
          <FormControl mb="4">
            <FormLabel>Deployment Source</FormLabel>
            <RadioGroup
              value={selectedDeployType}
              onChange={setSelectedDeployType}
            >
              <Stack
                direction={['column', 'column', 'row']}
                spacing={['1', '1', '6']}
                width="100%"
              >
                <Radio colorScheme="teal" value="git">
                  Git URL
                </Radio>
                <Radio colorScheme="teal" value="stateUrl">
                  IPFS Hash
                </Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          {selectedDeployType == 'git' && renderCannonfileInput()}

          {onChainPrevPkgQuery.isFetched &&
            (prevDeployLocation ? (
              <Text color="green">
                Previous Deployment: {prevDeployLocation}
              </Text>
            ) : (
              <Text color="yellow">Deployment from scratch.</Text>
            ))}

          <FormControl>
            <Checkbox
              onChange={(evt) =>
                setOverridePreviousState(evt.currentTarget.checked)
              }
            />{' '}
            Override Previous State
          </FormControl>

          {overridePreviousState && (
            <FormControl mb="6">
              <FormLabel>Previous Package</FormLabel>
              <InputGroup>
                <Input
                  placeholder="name:version@preset"
                  type="text"
                  value={previousPackageInput}
                  borderColor={
                    !previousPackageInput.length || !prevCannonDeployInfo.error
                      ? 'whiteAlpha.400'
                      : 'red.500'
                  }
                  background="black"
                  onChange={(evt: any) =>
                    setPreviousPackageInput(evt.target.value)
                  }
                />
                <InputRightElement>
                  {prevCannonDeployInfo.isError ? (
                    <CloseIcon color="red.500" />
                  ) : null}
                  {prevCannonDeployInfo.isFetching ? (
                    <Spinner />
                  ) : prevCannonDeployInfo.pkg ? (
                    <CheckIcon color="green.500" />
                  ) : null}
                </InputRightElement>
              </InputGroup>
              <FormHelperText color="gray.300">
                Specify the package this cannonfile is extending. See{' '}
                <Link as={NextLink} href="/learn/cli#build">
                  <Code>--upgrade-from</Code>
                </Link>
              </FormHelperText>
              {onChainPrevPkgQuery.error ? (
                <Alert mt="6" status="error" bg="red.700">
                  <AlertIcon mr={3} />
                  <strong>{onChainPrevPkgQuery.error.toString()}</strong>
                </Alert>
              ) : undefined}
            </FormControl>
          )}

          {selectedDeployType == 'partial' && (
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
                  onChange={(evt: any) =>
                    setPartialDeployIpfs(parseIpfsHash(evt.target.value))
                  }
                />
                <InputRightElement>
                  {partialDeployInfo.isError && <CloseIcon color="red.500" />}
                  {partialDeployInfo.isFetching &&
                    !partialDeployInfo.isError && <Spinner />}
                  {partialDeployInfo.pkg && <CheckIcon color="green.500" />}
                </InputRightElement>
              </InputGroup>
              <FormHelperText color="gray.300">
                If this deployment requires transactions executed in other
                contexts (e.g. contract deployments or function calls using
                other signers), provide the IPFS hash generated by building the
                package using the CLI.
              </FormHelperText>
            </FormControl>
          )}
          {selectedDeployType == 'partial' && renderCannonfileInput()}

          {renderAlertMessage()}
          <RenderPreviewButtonTooltip />
          {buildInfo.buildMessage && (
            <Alert mt="6" status="info" bg="gray.800">
              <Spinner mr={3} boxSize={4} />
              <strong>{buildInfo.buildMessage}</strong>
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
              <Text mb="2" fontWeight="bold">
                This safe will not be able to complete the following operations:
              </Text>
              {buildInfo.buildSkippedSteps.map((s, i) => (
                <Text fontFamily="monospace" key={i} mb="2">
                  <strong>{`[${s.name}]: `}</strong>
                  {s.err.toString()}
                </Text>
              ))}
            </Flex>
          )}
          {!!buildInfo.buildResult?.deployerSteps?.length &&
            !!buildInfo.buildResult?.safeSteps.length && (
              <Alert mt="6" status="info" mb="5">
                {deployer.queuedTransactions.length === 0 ? (
                  <VStack>
                    <Text color="black">
                      Some transactions should be executed outside the safe
                      before staging. You can execute these now in your browser.
                      By clicking the button below.
                    </Text>
                    <Button
                      onClick={() =>
                        deployer.queueTransactions(
                          buildInfo.buildResult!.deployerSteps.map(
                            (s) => s.tx as any
                          )
                        )
                      }
                    >
                      Execute Outside Safe Txns
                    </Button>
                  </VStack>
                ) : deployer.executionProgress.length <
                  deployer.queuedTransactions.length ? (
                  <Text>
                    Deploying txns {deployer.executionProgress.length + 1} /{' '}
                    {deployer.queuedTransactions.length}
                  </Text>
                ) : (
                  <Text>
                    All Transactions Queued Successfully. You may now continue
                    the safe deployment.
                  </Text>
                )}
              </Alert>
            )}
          {(buildInfo.buildResult?.safeSteps.length || 1) == 0 && (
            <Alert status="error">
              There are no transactions that would be executed by the gnosis
              safe.
            </Alert>
          )}
          {cannonDefInfo.def && multicallTxn.data && (
            <Box mt="10">
              <Heading size="md" mt={5}>
                {cannonDefInfo.def.getName(ctx)}:
                {cannonDefInfo.def.getVersion(ctx) || 'latest'}@
                {cannonDefInfo.def.getPreset(ctx)}
              </Heading>
            </Box>
          )}
          {uploadToPublishIpfs.deployedIpfsHash &&
            multicallTxn.data &&
            stager.safeTxn && (
              <Box mt="4" mb="10">
                <Heading size="sm" mb={2}>
                  Transactions
                </Heading>
                <TransactionDisplay
                  safe={currentSafe as any}
                  safeTxn={stager.safeTxn}
                />
              </Box>
            )}
          {uploadToPublishIpfs.writeToIpfsMutation.isPending && (
            <Alert mt="6" status="info" bg="gray.800">
              <Spinner mr={3} boxSize={4} />
              <strong>Uploading build result to IPFS...</strong>
            </Alert>
          )}
          {uploadToPublishIpfs.writeToIpfsMutation.error && (
            <Text>
              Failed to upload staged transaction to IPFS:{' '}
              {uploadToPublishIpfs.writeToIpfsMutation.error.toString()}
            </Text>
          )}
          {uploadToPublishIpfs.deployedIpfsHash && multicallTxn.data && (
            <Box>
              <NoncePicker safe={currentSafe} handleChange={setPickedNonce} />
              <HStack gap="6">
                {stager.execConditionFailed ? (
                  <Tooltip label={stager.signConditionFailed}>
                    <Button
                      isDisabled={
                        !!stager.signConditionFailed || stager.signing
                      }
                      size="lg"
                      w="100%"
                      onClick={async () => {
                        await stager.sign();
                      }}
                    >
                      {stager.signing ? (
                        <>
                          Currently Signing
                          <Spinner size="sm" ml={2} />
                        </>
                      ) : (
                        'Queue & Sign'
                      )}
                    </Button>
                  </Tooltip>
                ) : null}
                <Tooltip label={stager.execConditionFailed}>
                  <Button
                    isDisabled={
                      !!stager.execConditionFailed || isOutsideSafeTxnsRequired
                    }
                    size="lg"
                    w="100%"
                    onClick={() => {
                      execTxn.writeContract(stager.executeTxnConfig!, {
                        onSuccess: () => {
                          router.push(links.DEPLOY);

                          toast({
                            title: 'You successfully executed the transaction.',
                            status: 'success',
                            duration: 5000,
                            isClosable: true,
                          });
                        },
                      });
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
