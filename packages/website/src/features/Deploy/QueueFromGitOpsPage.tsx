'use client';

import { links } from '@/constants/links';
import { useMultisendQuery } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useDeployerWallet } from '@/hooks/deployer';
import {
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useMergedCannonDefInfo,
  useCannonFindUpgradeFromUrl,
  CannonWriteDeployToIpfsMutationResult,
  useCannonBuildTmp,
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
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  ChainBuilderContext,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert as AlertCannon } from '@/components/Alert';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { extractIpfsHash } from '@/helpers/ipfs';

const EMPTY_IPFS_MISC_URL =
  'ipfs://QmeSt2mnJKE8qmRhLyYbHQQxDKpsFbcWnw5e7JF4xVbN6k';

const cannonfileUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?\.toml$/i;

// TODO: is there any way to make a better context? maybe this means we should get rid of name using context?
const ctx: ChainBuilderContext = {
  chainId: 0,
  package: {},
  timestamp: 0 as any, // TODO: fix this
  settings: {},
  contracts: {},
  txns: {},
  imports: {},
  overrideSettings: {},
};

type DeployType = 'git' | 'partial';

export default function QueueFromGitOps() {
  const [selectedDeployType, setSelectedDeployType] =
    useState<DeployType>('git');
  const router = useRouter();
  const currentSafe = useStore((s) => s.currentSafe)!;
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [genericInput, setGenericInput] = useState('');
  const [cannonfileUrlInput, setCannonfileUrlInput] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');
  const [prevPackageInputRef, setPrevPackageInputRef] =
    useState<PackageReference | null>(null);

  const [previousPackageInput, setPreviousPackageInput] = useState('');
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);
  const { openConnectModal } = useConnectModal();
  const [writeToIpfsMutationRes, setWriteToIpfsMutationRes] = useState<{
    isLoading: boolean;
    error: Error | null;
    data: CannonWriteDeployToIpfsMutationResult | null;
  } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const settings = useStore((s) => s.settings);

  const deployer = useDeployerWallet(currentSafe?.chainId);

  const gitInfo = useMemo(() => {
    if (
      !cannonfileUrlRegex.test(cannonfileUrlInput) ||
      !cannonfileUrlInput.includes('/blob/')
    ) {
      return { gitUrl: '', gitRef: '', gitFile: '' };
    }

    const [url, blobPath] = cannonfileUrlInput.split('/blob/');
    const urlComponents = blobPath.split('/');
    const branchName = urlComponents[0];
    const filePath = urlComponents.slice(1).join('/');

    return {
      gitUrl: url,
      gitRef: branchName,
      gitFile: filePath,
    };
  }, [cannonfileUrlInput]);

  const partialDeployInfo = useCannonPackage(
    partialDeployIpfs ? `ipfs://${partialDeployIpfs}` : '',
    currentSafe?.chainId
  );

  const cannonDefInfo = useMergedCannonDefInfo(
    gitInfo.gitUrl,
    gitInfo.gitRef,
    gitInfo.gitFile,
    partialDeployInfo
  );

  const cannonDefInfoError: string = gitInfo.gitUrl
    ? (cannonDefInfo?.error as any)?.toString()
    : cannonfileUrlInput &&
      'The format of your URL appears incorrect. Please double check and try again.';

  const fullPackageRef = cannonDefInfo?.def?.getPackageRef(ctx) ?? null;

  const onChainPrevPkgQuery = useCannonFindUpgradeFromUrl(
    prevPackageInputRef || fullPackageRef || undefined,
    currentSafe?.chainId,
    cannonDefInfo?.def?.getDeployers()
  );

  const prevDeployLocation = partialDeployIpfs
    ? `ipfs://${partialDeployIpfs}`
    : onChainPrevPkgQuery.data || '';

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation,
    currentSafe?.chainId
  );

  useEffect(() => {
    if (previousPackageInput) {
      setPrevPackageInputRef(new PackageReference(previousPackageInput));
    } else {
      setPrevPackageInputRef(null);
    }
  }, [previousPackageInput]);

  useEffect(() => {
    if (!prevCannonDeployInfo.ipfsQuery.data?.deployInfo)
      return setPreviousPackageInput('');

    const name = prevCannonDeployInfo.ipfsQuery.data?.deployInfo?.def?.name;
    const version =
      prevCannonDeployInfo.ipfsQuery.data?.deployInfo?.def?.version || 'latest';
    const preset = prevCannonDeployInfo.ipfsQuery.data?.deployInfo?.def?.preset;
    setPreviousPackageInput(`${name}:${version}@${preset}`);
  }, [prevCannonDeployInfo]);

  // run the build and get the list of transactions we need to run
  const { buildState, doBuild, resetState } = useCannonBuildTmp(currentSafe);

  const nextCannonDeployInfo = useMemo(() => {
    return cannonDefInfo?.def
      ? ({
          generator: `cannon website ${pkg.version}`,
          timestamp: Math.floor(Date.now() / 1000),
          def: cannonDefInfo.def.toJson(),
          state: buildState.result?.state || {},
          options: partialDeployInfo?.ipfsQuery.data?.deployInfo?.options || {},
          meta: partialDeployInfo?.ipfsQuery.data?.deployInfo?.meta,
          miscUrl:
            partialDeployInfo?.ipfsQuery.data?.deployInfo?.miscUrl ||
            EMPTY_IPFS_MISC_URL,
          chainId: currentSafe.chainId,
        } satisfies DeploymentInfo)
      : undefined;
  }, [
    buildState.result?.state,
    cannonDefInfo?.def,
    currentSafe.chainId,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.meta,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.miscUrl,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.options,
  ]);

  const writeToIpfsMutation = useCannonWriteDeployToIpfs();

  useEffect(() => {
    const callMutation = async () => {
      if (['success'].includes(buildState.status)) {
        try {
          setWriteToIpfsMutationRes({
            isLoading: true,
            error: null,
            data: null,
          });

          const res = await writeToIpfsMutation.mutateAsync({
            runtime: buildState.result?.runtime,
            deployInfo: nextCannonDeployInfo,
            metaUrl: prevCannonDeployInfo.metaUrl,
          });

          setWriteToIpfsMutationRes({
            isLoading: false,
            error: null,
            data: res,
          });
        } catch (error) {
          setWriteToIpfsMutationRes({
            isLoading: false,
            error: error as Error,
            data: null,
          });
        }
      }
    };

    void callMutation();
  }, [buildState.status]);

  const refsInfo = useGitRefsList(gitInfo.gitUrl);
  const foundRef = refsInfo.refs?.find(
    (r) =>
      (r.ref.startsWith('refs/heads/') || r.ref.startsWith('refs/tags/')) &&
      r.ref.endsWith(gitInfo.gitRef)
  )?.oid;
  const gitHash = gitInfo.gitRef.match(/^[0-9a-f]+$/)
    ? foundRef || gitInfo.gitRef
    : foundRef;

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitInfo.gitUrl + ':' + gitInfo.gitFile
  );

  const multisendTxsParam = useMemo(() => {
    return [
      // supply the hint data
      {
        to: zeroAddress,
        data: encodeAbiParameters(
          [{ type: 'string[]' }],
          [
            [
              'deploy',
              writeToIpfsMutationRes?.data?.mainUrl,
              prevDeployLocation || '',
              gitInfo.gitUrl && gitInfo.gitFile
                ? `${gitInfo.gitUrl}:${gitInfo.gitFile}`
                : '',
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
      gitInfo.gitUrl && gitInfo.gitFile
        ? ({
            to: onchainStore.deployAddress,
            data: encodeFunctionData({
              abi: onchainStore.ABI,
              functionName: 'set',
              args: [
                keccak256(
                  toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}gitHash`)
                ),
                '0x' + gitHash,
              ],
            }),
          } as Partial<TransactionRequestBase>)
        : {},
      gitInfo.gitUrl && gitInfo.gitFile
        ? ({
            to: onchainStore.deployAddress,
            data: encodeFunctionData({
              abi: onchainStore.ABI,
              functionName: 'set',
              args: [
                keccak256(
                  toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}cannonPackage`)
                ),
                stringToHex(writeToIpfsMutationRes?.data?.mainUrl ?? ''),
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
                cannonDefInfo?.def
                  ? `${cannonDefInfo.def.getName(
                      ctx
                    )}@${cannonDefInfo.def.getPreset(ctx)}`
                  : ''
              )
            ),
            // TODO: we would really rather have the timestamp be when the txn was executed. something to fix when we have a new state contract
            stringToHex(
              `${Math.floor(Date.now() / 1000)}_${
                writeToIpfsMutationRes?.data?.mainUrl ?? ''
              }`
            ),
          ],
        }),
      } as Partial<TransactionRequestBase>,
    ].concat(
      buildState.result?.safeSteps.map(
        (s) => s.tx as unknown as Partial<TransactionRequestBase>
      ) || []
    );
  }, [
    buildState.result?.safeSteps,
    cannonDefInfo?.def,
    gitInfo.gitFile,
    gitHash,
    gitInfo.gitUrl,
    prevDeployLocation,
    prevInfoQuery.data,
    writeToIpfsMutationRes?.data?.mainUrl,
  ]);

  const { data: multicallTxn } = useMultisendQuery(
    Boolean(
      !prevInfoQuery.isLoading &&
        buildState.result &&
        buildState.status == 'success'
    ),
    multisendTxsParam
  );

  let totalGas = BigInt(0);

  for (const step of buildState.result?.safeSteps || []) {
    totalGas += BigInt(step.gas.toString());
  }

  const toast = useToast();

  const stager = useTxnStager(
    multicallTxn?.data
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
    (buildState.result?.deployerSteps.length || 0) > 0 && !deployer.isComplete;

  const loadingDataForDeploy =
    prevCannonDeployInfo.isFetching ||
    partialDeployInfo?.isFetching ||
    onChainPrevPkgQuery.isFetching ||
    buildState.status === 'building' ||
    writeToIpfsMutationRes?.isLoading;

  const handlePreviewTxnsClick = useCallback(async () => {
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
        await switchChainAsync({ chainId: currentSafe?.chainId || 10 });
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

    doBuild(cannonDefInfo?.def, partialDeployInfo?.ipfsQuery.data?.deployInfo);
  }, [
    isConnected,
    chainId,
    currentSafe?.chainId,
    cannonDefInfo?.def,
    partialDeployInfo?.ipfsQuery.data?.deployInfo,
  ]);

  const hasDeployers = useMemo(() => {
    return Boolean(cannonDefInfo?.def?.getDeployers()?.length);
  }, [cannonDefInfo?.def]);

  const tomlRequiresPrevPackage = useMemo(
    () =>
      Boolean(
        cannonfileUrlInput &&
          cannonDefInfo?.def &&
          !hasDeployers &&
          cannonDefInfo.def.allActionNames.some(
            (item) => item.startsWith('deploy.') || item.startsWith('contract.')
          )
      ),
    [cannonfileUrlInput, cannonDefInfo?.def, hasDeployers]
  );

  const canTomlBeDeployedUsingWebsite = useMemo(() => {
    if (!cannonDefInfo?.def) return false;

    // If there are no deployers defined and there are deploy/contract actions,
    // we can't deploy from website
    if (
      !hasDeployers &&
      cannonDefInfo.def.allActionNames.some(
        (item) => item.startsWith('deploy.') || item.startsWith('contract.')
      )
    ) {
      return false;
    }

    return true;
  }, [cannonDefInfo?.def, hasDeployers]);

  const disablePreviewButton = useMemo(() => {
    if (
      loadingDataForDeploy ||
      chainId !== currentSafe?.chainId ||
      !cannonDefInfo?.def
    ) {
      return true;
    }

    if (buildState.status === 'building' || buildState.status === 'success') {
      return true;
    }

    if (
      onChainPrevPkgQuery.isFetched &&
      !prevDeployLocation &&
      tomlRequiresPrevPackage &&
      !previousPackageInput
    ) {
      return true;
    }

    return !canTomlBeDeployedUsingWebsite;
  }, [
    loadingDataForDeploy,
    chainId,
    currentSafe?.chainId,
    cannonDefInfo?.def,
    buildState.status,
    onChainPrevPkgQuery.isFetched,
    prevDeployLocation,
    tomlRequiresPrevPackage,
    previousPackageInput,
    canTomlBeDeployedUsingWebsite,
  ]);

  const PreviewButton = useCallback(
    ({ message }: { message?: string }) => {
      const buttonText = loadingDataForDeploy
        ? 'Loading required data...'
        : 'Preview Transactions to Queue';

      return (
        <Tooltip label={message}>
          <Button
            width="100%"
            colorScheme="teal"
            isDisabled={disablePreviewButton}
            onClick={handlePreviewTxnsClick}
          >
            {buttonText}
          </Button>
        </Tooltip>
      );
    },
    [loadingDataForDeploy, disablePreviewButton]
  );

  const RenderPreviewButtonTooltip = useCallback(() => {
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

    if (partialDeployInfo?.isError) {
      const message = `Error fetching partial deploy info, error: ${partialDeployInfo.error?.message}`;
      return <PreviewButton message={message} />;
    }

    if (
      prevCannonDeployInfo.isFetching ||
      onChainPrevPkgQuery.isFetching ||
      partialDeployInfo?.isFetching
    ) {
      return <PreviewButton message="Fetching package info, please wait..." />;
    }

    if (buildState.status === 'building') {
      return <PreviewButton message="Generating build info, please wait..." />;
    }

    if (!cannonDefInfo?.def) {
      return (
        <PreviewButton message="No cannonfile definition found, please input the link to the cannonfile to build" />
      );
    }

    return <PreviewButton />;
  }, [
    chainId,
    currentSafe?.chainId,
    partialDeployInfo?.isError,
    partialDeployInfo?.isFetching,
    partialDeployInfo.error?.message,
    prevCannonDeployInfo.isFetching,
    onChainPrevPkgQuery.isFetching,
    buildState.status,
    cannonDefInfo?.def,
    PreviewButton,
  ]);

  const handleGenericInputChange = useCallback(
    (input: string) => {
      resetState();
      setCannonfileUrlInput('');
      setPartialDeployIpfs('');
      setInputError(null);

      const isCannonfileUrl = cannonfileUrlRegex.test(input);
      const isIpfsHash = extractIpfsHash(input);

      if (isCannonfileUrl) {
        setSelectedDeployType('git');
        setCannonfileUrlInput(input);
      } else if (isIpfsHash) {
        setSelectedDeployType('partial');
        setPartialDeployIpfs(isIpfsHash);
      } else if (input.trim() !== '') {
        setInputError(
          'Invalid input. Please enter a valid Cannonfile URL or IPFS hash.'
        );
      }
    },
    [resetState]
  );

  const cannonInfoDefinitionLoaded = useMemo(
    () =>
      cannonfileUrlInput.length > 0 &&
      !cannonDefInfo.error &&
      cannonDefInfo?.def,
    [cannonfileUrlInput, cannonDefInfo]
  );

  const partialDeployInfoLoaded = useMemo(
    () =>
      !partialDeployInfo?.isFetching &&
      !partialDeployInfo?.isError &&
      partialDeployInfo?.ipfsQuery.data?.deployInfo,
    [partialDeployInfo]
  );

  const renderAlert = useCallback(() => {
    if (settings.isIpfsGateway) {
      return (
        <Alert status="error" bg="gray.700">
          <AlertIcon mr={3} />
          Your current IPFS URL is set to a gateway. Update your IPFS URL to an
          API endpoint where you can pin files in{' '}
          <Link as={NextLink} href="/settings">
            settings
          </Link>
          .
        </Alert>
      );
    }

    if (cannonDefInfo?.def && cannonDefInfo.def.danglingDependencies.size > 0) {
      return (
        <Alert status="error" bg="gray.700">
          <AlertIcon mr={3} />
          <Flex direction="column">
            <Text>
              The cannonfile contains invalid dependencies. Please ensure the
              following references are defined:
            </Text>
            <div>
              {Array.from(cannonDefInfo.def.danglingDependencies).map(
                (dependency) => (
                  <React.Fragment key={dependency}>
                    <Text as="span" fontFamily="monospace">
                      {dependency}
                    </Text>
                    <br />
                  </React.Fragment>
                )
              )}
            </div>
          </Flex>
        </Alert>
      );
    }

    return null;
  }, [settings.isIpfsGateway, cannonDefInfo?.def]);

  const renderCannonFileInput = useCallback(() => {
    return (
      <FormControl mb="4">
        <FormLabel>Cannonfile (Optional)</FormLabel>
        <InputGroup>
          <Input
            type="text"
            placeholder="https://github.com/../cannonfile.toml"
            value={cannonfileUrlInput}
            borderColor={!cannonDefInfoError ? 'whiteAlpha.400' : 'red.500'}
            isDisabled={selectedDeployType == 'partial' && !partialDeployIpfs}
            background="black"
            onChange={(evt) => setCannonfileUrlInput(evt.target.value)}
          />
          <InputRightElement>
            {cannonfileUrlInput.length > 0 && cannonDefInfo?.isFetching ? (
              <Spinner />
            ) : cannonfileUrlInput.length > 0 &&
              !cannonDefInfo.error &&
              cannonDefInfo?.def ? (
              <CheckIcon color="green.500" />
            ) : null}
          </InputRightElement>
        </InputGroup>
        <FormHelperText color="gray.300">
          The Cannonfile URL is used to generate the deployment data to display
          a git diff in Cannon.
        </FormHelperText>
        {cannonDefInfoError ? (
          <Alert mt="6" status="error" bg="gray.700">
            <AlertIcon mr={3} />
            <strong>{cannonDefInfoError.toString()}</strong>
          </Alert>
        ) : undefined}
      </FormControl>
    );
  }, [
    cannonfileUrlInput,
    cannonDefInfo,
    cannonDefInfoError,
    selectedDeployType,
    partialDeployIpfs,
  ]);

  return (
    <>
      <Container maxWidth="container.md" py={8}>
        <Box mb={6}>
          <Heading size="lg" mb={2}>
            Queue Deployment
          </Heading>
          <Text color="gray.300">
            Queue deployments using Safe. After the transactions are executed,
            the resulting package can be published to the registry.
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
          {/* <FormControl mb="4">
            <FormLabel>Deployment Source</FormLabel>
            <RadioGroup
              value={selectedDeployType}
              onChange={(value: DeployType) => {
                resetState();
                setCannonfileUrlInput('');
                setPartialDeployIpfs('');
                setSelectedDeployType(value);
              }}
            >
              <Stack
                direction={['column', 'column', 'row']}
                spacing={['1', '1', '6']}
                width="100%"
              >
                <Radio colorScheme="teal" value="git">
                  Git URL
                </Radio>
                <Radio colorScheme="teal" value="partial">
                  IPFS Hash
                </Radio>
              </Stack>
            </RadioGroup>

            <Text color="gray.300" mt="2">
              {selectedDeployType == 'git'
                ? 'Enter a Git URL repository with a cannonfile to build.'
                : 'Use a partial deployment from a IPFS hash.'}
            </Text>
          </FormControl> */}
          <FormControl mb="4">
            <FormLabel>Cannonfile URL or Deployment Data IPFS Hash</FormLabel>
            <HStack>
              <InputGroup>
                <Input
                  type="text"
                  placeholder="https://github.com/../cannonfile.toml or Qm.."
                  value={genericInput}
                  borderColor={
                    !cannonDefInfoError ? 'whiteAlpha.400' : 'red.500'
                  }
                  disabled={chainId !== currentSafe?.chainId}
                  background="black"
                  onChange={(evt) => {
                    const value = evt.target.value;
                    setGenericInput(value);
                    handleGenericInputChange(value);
                  }}
                />
                {selectedDeployType == 'git' && (
                  <InputRightElement>
                    {cannonfileUrlInput.length > 0 &&
                    cannonDefInfo?.isFetching ? (
                      <Spinner />
                    ) : cannonInfoDefinitionLoaded ? (
                      <CheckIcon color="green.500" />
                    ) : null}
                  </InputRightElement>
                )}
                {selectedDeployType == 'partial' && (
                  <InputRightElement>
                    {partialDeployInfo?.isError && (
                      <CloseIcon color="red.500" />
                    )}
                    {partialDeployInfo?.isFetching &&
                      !partialDeployInfo?.isError && <Spinner />}
                    {partialDeployInfo?.ipfsQuery.data?.deployInfo && (
                      <CheckIcon color="green.500" />
                    )}
                  </InputRightElement>
                )}
              </InputGroup>
            </HStack>
            {cannonDefInfoError ? (
              <Alert mt="6" status="error" bg="gray.700">
                <AlertIcon mr={3} />
                <strong>{cannonDefInfoError.toString()}</strong>
              </Alert>
            ) : undefined}
            {inputError && (
              <FormHelperText color="red.500">{inputError}</FormHelperText>
            )}
          </FormControl>
          {selectedDeployType == 'git' && (
            <Flex flexDir="column" my="4">
              {onChainPrevPkgQuery.isFetched &&
                (prevDeployLocation ? (
                  <AlertCannon borderless status="info">
                    Previous Deployment:{' '}
                    <Link
                      href={`/ipfs?cid=${prevDeployLocation.replace(
                        'ipfs://',
                        ''
                      )}&compressed=true`}
                      target="_blank"
                    >
                      {prevDeployLocation.replace('ipfs://', '')}
                    </Link>
                  </AlertCannon>
                ) : (
                  <AlertCannon borderless status="info">
                    {tomlRequiresPrevPackage
                      ? 'We couldn\'t find a previous deployment for your cannonfile. Please, enter a value in the "Previous Package" input or modify your cannonfile to include a "deployers" key.'
                      : 'Deployment from scratch'}
                  </AlertCannon>
                ))}
            </Flex>
          )}
          {/*  ipfs://Qma8R3UNPp2WQZdwZ7Ri95D4ddqT5auSpU8TUxwh4nLHij */}
          {/* {(partialDeployIpfs || cannonfileUrlInput) && (
            <FormControl display="flex" alignItems="center" my="2">
              <Checkbox
                mr="2"
                onChange={(evt) =>
                  setOverridePreviousState(evt.currentTarget.checked)
                }
              />{' '}
              Override Previous State
            </FormControl>
          )} */}
          {(partialDeployInfoLoaded || tomlRequiresPrevPackage) && (
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
                  ) : prevCannonDeployInfo.ipfsQuery.data?.deployInfo ? (
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
          {selectedDeployType == 'partial' &&
            partialDeployIpfs.length > 0 &&
            partialDeployInfoLoaded &&
            renderCannonFileInput()}

          {renderAlert()}

          {!isConnected ? (
            <Button
              width="100%"
              colorScheme="teal"
              onClick={() => openConnectModal && openConnectModal()}
            >
              Connect wallet
            </Button>
          ) : chainId !== currentSafe?.chainId ? (
            <Button
              width="100%"
              colorScheme="teal"
              onClick={() =>
                switchChainAsync({ chainId: currentSafe?.chainId || 10 })
              }
            >
              Switch Network
            </Button>
          ) : (
            <RenderPreviewButtonTooltip />
          )}
          {buildState.message && (
            <Alert mt="6" status="info" bg="gray.800">
              <Spinner mr={3} boxSize={4} />
              <strong>{buildState.message}</strong>
            </Alert>
          )}
          {buildState.error && (
            <Alert mt="6" status="error" bg="red.700">
              <AlertIcon mr={3} />
              <strong>{buildState.error}</strong>
            </Alert>
          )}
          {buildState.skippedSteps.length > 0 && (
            <AlertCannon my={2} status="error">
              <Text mb="2" fontWeight="bold">
                This safe will not be able to complete the following operations:
              </Text>
              <Box maxHeight="300px" overflow="auto">
                {buildState.skippedSteps.map((s, i) => (
                  <Text fontFamily="monospace" key={i} mb="2">
                    <strong>{`[${s.name}]: `}</strong>
                    {s.name.startsWith('deploy.') ||
                    s.name.startsWith('contract.')
                      ? 'Is not possible to build and deploy a contract from source code from the website. You should first build your cannonfile using the CLI and continue the deployment from a partial build.'
                      : s.err.toString()}
                  </Text>
                ))}
              </Box>
            </AlertCannon>
          )}
          {!!buildState.result?.deployerSteps?.length &&
            (buildState.result?.safeSteps.length || 0) > 0 && (
              <Box
                mt="6"
                mb="5"
                border="1px solid"
                borderColor="gray.600"
                p="4"
                borderRadius="md"
              >
                {deployer.queuedTransactions.length === 0 ? (
                  <VStack>
                    <Text color="gray.300">
                      The following steps should be executed outside the safe
                      before staging.
                      {buildState.result?.deployerSteps.map((s) => (
                        <Text color="gray.300" ml="2" key={s.name}>
                          - {s.name}
                        </Text>
                      ))}
                      <Text color="gray.300" mb="4">
                        You can execute these now in your browser. By clicking
                        the button below.
                      </Text>
                    </Text>
                    <Button
                      onClick={() =>
                        deployer.queueTransactions(
                          buildState.result!.deployerSteps.map(
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
              </Box>
            )}
          {cannonDefInfo?.def && multicallTxn?.data && (
            <Box mt="4">
              <Heading size="md" mt={5}>
                Package: {cannonDefInfo.def.getName(ctx)}:
                {cannonDefInfo.def.getVersion(ctx) || 'latest'}@
                {cannonDefInfo.def.getPreset(ctx)}
              </Heading>
            </Box>
          )}
          {buildState.status == 'success' &&
            writeToIpfsMutationRes?.data?.mainUrl &&
            !multicallTxn?.data && (
              <Alert mt="6" status="info" bg="gray.800">
                No simulated transactions have succeeded. Please ensure you have
                selected the correct Safe wallet and that you have sufficient
                permissions to execute transactions.
              </Alert>
            )}
          {writeToIpfsMutationRes?.data?.mainUrl &&
            multicallTxn?.data &&
            stager.safeTxn && (
              <Box mt="4" mb="4">
                <Heading size="sm" mb={2}>
                  Safe Transactions:
                </Heading>
                {buildState.result?.safeSteps.length === 0 ? (
                  <AlertCannon borderless status="info">
                    There are no transactions that would be executed by the
                    Safe.
                  </AlertCannon>
                ) : (
                  <TransactionDisplay
                    safe={currentSafe as any}
                    safeTxn={stager.safeTxn}
                  />
                )}
              </Box>
            )}
          {writeToIpfsMutationRes?.data?.mainUrl &&
            multicallTxn?.data &&
            stager.safeTxn &&
            (buildState.result?.safeSteps.length || 0) > 0 &&
            buildState.skippedSteps.length > 0 && (
              <AlertCannon borderless status="warning" mt="0">
                We have detected transactions in your Cannonfile that cannot be
                executed, which may lead to undesired effects on your
                deployment. We advise you not to proceed unless you are
                absolutely certain of what you are doing, as this will result in
                a partial deployment package.
              </AlertCannon>
            )}
          {writeToIpfsMutationRes?.isLoading && (
            <Alert mt="6" status="info" bg="gray.800">
              <Spinner mr={3} boxSize={4} />
              <strong>Uploading build result to IPFS...</strong>
            </Alert>
          )}
          {writeToIpfsMutationRes?.error && (
            <Text>
              Failed to upload staged transaction to IPFS:{' '}
              {writeToIpfsMutationRes.error.toString()}
            </Text>
          )}
          {writeToIpfsMutationRes?.data?.mainUrl && multicallTxn?.data && (
            <Box>
              <NoncePicker safe={currentSafe} handleChange={setPickedNonce} />
              <HStack gap="6">
                {stager.execConditionFailed &&
                (buildState.result?.safeSteps.length || 0) > 0 ? (
                  <Tooltip label={stager.signConditionFailed}>
                    <Button
                      isDisabled={
                        !!stager.signConditionFailed || stager.signing
                      }
                      colorScheme="teal"
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
                    colorScheme="teal"
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
