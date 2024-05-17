'use client';

import { links } from '@/constants/links';
import { parseIpfsHash } from '@/helpers/ipfs';
import { makeMultisend } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { CheckIcon } from '@chakra-ui/icons';
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
} from '@chakra-ui/react';
import { ChainBuilderContext } from '@usecannon/builder';
import _ from 'lodash';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useWriteContract } from 'wagmi';
import pkg from '../../../package.json';
import NoncePicker from './NoncePicker';
import { TransactionDisplay } from './TransactionDisplay';
import 'react-diff-view/style/index.css';

export default function QueueFromGitOpsPage() {
  return <QueueFromGitOps />;
}

function QueueFromGitOps() {
  const router = useRouter();
  const currentSafe = useStore((s) => s.currentSafe);
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

  const cannonDefInfo = useLoadCannonDefinition(gitUrl, gitRef, gitFile);

  const cannonDefInfoError: string = gitUrl
    ? (cannonDefInfo.error as any)?.toString()
    : cannonfileUrlInput &&
      'The format of your URL appears incorrect. Please double check and try again.';

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
  const chainId = currentSafe?.chainId;

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

    return cannonDefInfo.def?.getPreset(ctx) || 'main';
  }, [previousPackageInput, cannonDefInfo.def?.getPreset(ctx)]);

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
    (partialDeployIpfs ? `ipfs://${partialDeployIpfs}` : null) ||
    cannonPkgPreviousInfo.pkgUrl ||
    cannonPkgVersionInfo.pkgUrl;

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation ? `@ipfs:${_.last(prevDeployLocation.split('/'))}` : ''
  );

  const partialDeployInfo = useCannonPackage(
    partialDeployIpfs ? `@ipfs:${partialDeployIpfs}` : ''
  );

  useEffect(() => {
    if (!cannonDefInfo.def) return setPreviousPackageInput('');

    const name = cannonDefInfo.def.getName(ctx);
    const version = 'latest';
    const preset = cannonDefInfo.def.getPreset(ctx);
    setPreviousPackageInput(`${name}:${version}@${preset}`);
  }, [cannonDefInfo.def]);

  // run the build and get the list of transactions we need to run
  const buildInfo = useCannonBuild(
    currentSafe,
    cannonDefInfo.def,
    prevCannonDeployInfo.pkg
  );

  const uploadToPublishIpfs = useCannonWriteDeployToIpfs(
    buildInfo.buildResult?.runtime,
    cannonDefInfo.def
      ? {
          generator: `cannon website ${pkg.version}`,
          timestamp: Math.floor(Date.now() / 1000),
          def: cannonDefInfo.def?.toJson(),
          state: buildInfo.buildResult?.state || {},
          options: prevCannonDeployInfo.pkg?.options || {},
          meta: prevCannonDeployInfo.pkg?.meta,
          miscUrl: prevCannonDeployInfo.pkg?.miscUrl || '',
        }
      : undefined,
    prevCannonDeployInfo.metaUrl || undefined
  );

  useEffect(() => {
    if (buildInfo.buildResult) {
      uploadToPublishIpfs.writeToIpfsMutation.mutate();
    }
  }, [buildInfo.buildResult?.steps]);

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
                    Array.isArray(prevInfoQuery.data?.[0].result) &&
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
      onSignComplete() {
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

  const isPartialDataRequired =
    buildInfo.buildSkippedSteps.filter(
      (s) => s.name.includes('contract') || s.name.includes('router')
    ).length > 0;

  let alertMessage;
  if (chainId !== currentSafe?.chainId) {
    alertMessage =
      'Your wallet must be connected to the same network as the selected Safe.';
  } else if (settings.isIpfsGateway) {
    alertMessage = (
      <>
        Update your IPFS URL to an API endpoint where you can pin files in{' '}
        <Link href="/settings">settings</Link>.
      </>
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
                    !cannonDefInfoError ? 'whiteAlpha.400' : 'red.500'
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
            {cannonDefInfoError ? (
              <Alert mt="6" status="error" bg="gray.700">
                <AlertIcon mr={3} />
                <strong>{cannonDefInfoError.toString()}</strong>
              </Alert>
            ) : undefined}
          </FormControl>

          <FormControl mb="6">
            <FormLabel>Previous Package</FormLabel>
            <InputGroup>
              <Input
                placeholder="name:version@preset"
                type="text"
                value={previousPackageInput}
                borderColor={
                  !previousPackageInput.length || !cannonPkgPreviousInfo.error
                    ? 'whiteAlpha.400'
                    : 'red.500'
                }
                background="black"
                onChange={(evt: any) =>
                  setPreviousPackageInput(evt.target.value)
                }
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
            {cannonPkgPreviousInfo.error ? (
              <Alert mt="6" status="error" bg="red.700">
                <AlertIcon mr={3} />
                <strong>{cannonPkgPreviousInfo.error.toString()}</strong>
              </Alert>
            ) : undefined}
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
                onChange={(evt: any) =>
                  setPartialDeployIpfs(parseIpfsHash(evt.target.value))
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
              chainId !== currentSafe?.chainId ||
              settings.isIpfsGateway ||
              settings.ipfsApiUrl.includes('https://repo.usecannon.com') ||
              !cannonDefInfo.def ||
              cannonPkgPreviousInfo.isFetching ||
              partialDeployInfo.isFetching ||
              cannonPkgVersionInfo.isFetching ||
              buildInfo.isBuilding
            }
            onClick={() => buildInfo.doBuild()}
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
          {isPartialDataRequired && (
            <Alert mt="6" status="error" bg="red.700" mb="5">
              <Flex flexDir="column" gap={3}>
                <Text>
                  The web deployer is unable to compile and deploy contracts and
                  routers. Run the following command to generate partial deploy
                  data:
                </Text>
                <Code display="block" p="2">
                  cannon build {gitFile} --upgrade-from {previousPackageInput}{' '}
                  --chain-id {currentSafe?.chainId}
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
          {uploadToPublishIpfs.writeToIpfsMutation.isPending && (
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
                      !!stager.execConditionFailed || isPartialDataRequired
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
