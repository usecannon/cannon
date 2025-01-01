import * as viem from 'viem';
import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Link,
  Text,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Step,
  StepDescription as BaseStepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator as BaseStepSeparator,
  StepStatus,
  StepTitle as BaseStepTitle,
  Stepper,
  useBreakpointValue,
  useSteps,
  chakra,
  Spinner,
} from '@chakra-ui/react';
import { SafeTransaction } from '@/types/SafeTransaction';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useSafeTransactionStatus, SafeTransactionStatus } from '@/hooks/safe';
type Orientation = 'horizontal' | 'vertical';

const StepTitle = chakra(BaseStepTitle, {
  baseStyle: {
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontFamily: 'var(--font-miriam)',
    textShadow: '0px 0px 4px rgba(255, 255, 255, 0.33)',
  },
});

const StepDescription = chakra(BaseStepDescription, {
  baseStyle: {
    color: 'gray.300',
  },
});

const StepSeparator = chakra(BaseStepSeparator);

export function TransactionStepper(props: {
  chainId: number;
  cannonPackage: any;
  safeTxn: SafeTransaction | null;
  published: boolean;
  publishable: boolean;
  signers: string[];
  threshold: number;
}) {
  const { getExplorerUrl } = useCannonChains();

  const packagePublished = props.published;
  const transactionHash = props.safeTxn?.transactionHash;
  const packageRef = props.cannonPackage?.resolvedName?.length
    ? `${props.cannonPackage.resolvedName}:${
        props.cannonPackage.resolvedVersion
      }${
        props.cannonPackage.resolvedPreset
          ? '@' + props.cannonPackage.resolvedPreset
          : ''
      }`
    : undefined;

  const { activeStep, setActiveStep } = useSteps({
    index: 1,
    count: props.publishable ? 4 : 3,
  });

  let step = 1;
  if (packagePublished && transactionHash) {
    step = 4;
  } else if (transactionHash) {
    step = 3;
  } else if (props.signers.length >= props.threshold) {
    step = 2;
  }

  useEffect(() => {
    setActiveStep(step);
  }, [step]);

  const safeTransactionStatus = useSafeTransactionStatus(
    props.chainId,
    transactionHash as viem.Hash
  );

  const isExecutionFailure = useMemo(
    () => safeTransactionStatus === SafeTransactionStatus.EXECUTION_FAILURE,
    [safeTransactionStatus]
  );
  const orientation = useBreakpointValue({
    base: 'vertical' as Orientation,
    md: 'horizontal' as Orientation,
  });

  const queuedTimeAgo = useMemo(
    () =>
      props.safeTxn?.submissionDate
        ? formatDistanceToNow(
            new Date(Date.parse(props.safeTxn.submissionDate)),
            {
              addSuffix: true,
            }
          )
        : 'successfully',
    [props.safeTxn]
  );

  // const etherscanUrl =
  //   (Object.values(chains).find((chain) => chain.id === props.chainId) as any)
  //     ?.blockExplorers?.default?.url ?? 'https://etherscan.io';

  const packageName = props.cannonPackage.resolvedName;
  const version = props.cannonPackage.resolvedVersion || 'latest';
  const preset = props.cannonPackage.resolvedPreset || 'main';

  return (
    <>
      {/*
      <Box display="none">
        {hintData.gitRepoUrl && (
          <Box>
            {hintData.gitRepoUrl}@{hintData.gitRepoHash}
          </Box>
        )}
        {hintData && (
          <Box
            bg="blackAlpha.600"
            border="1px solid"
            borderColor="gray.900"
            borderRadius="md"
            p={6}
            mb={6}
          >
            <FormControl>
              <FormLabel mb="1">Cannon&nbsp;Package</FormLabel>
              {reverseLookupCannonPackage.pkgUrl ? (
                <Box>
                  <Link
                    href={
                      'https://usecannon.com/packages/' +
                      cannonPackage.resolvedName
                    }
                    isExternal
                  >
                    {reverseLookupCannonPackage.pkgUrl ===
                    hintData.cannonPackage ? (
                      <CheckIcon color={'green'} />
                    ) : (
                      <WarningIcon color="red" />
                    )}
                    &nbsp;{cannonPackage.resolvedName}:
                    {cannonPackage.resolvedVersion}@
                    {cannonPackage.resolvedPreset}
                  </Link>
                  &nbsp;(
                  <Link
                    href={createIPLDLink(hintData.cannonPackage)}
                    isExternal
                  >
                    {formatHash(hintData.cannonPackage)}
                    <ExternalLinkIcon transform="translate(4px,-2px)" />
                  </Link>
                  )
                </Box>
              ) : (
                <Link href={createIPLDLink(hintData.cannonPackage)} isExternal>
                  {formatHash(hintData.cannonPackage)}
                  <ExternalLinkIcon transform="translate(4px,-2px)" />
                </Link>
              )}
            </FormControl>
          </Box>
        )}
      </Box>
              */}

      <Stepper
        size="sm"
        index={activeStep}
        orientation={orientation}
        colorScheme={isExecutionFailure ? 'red' : 'teal'}
      >
        <Step key={1}>
          <StepIndicator
            borderWidth="1px !important"
            borderColor={
              isExecutionFailure
                ? 'red.500'
                : activeStep >= 1
                ? 'teal.500'
                : 'gray.200'
            }
          >
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle>Queue</StepTitle>
            <StepDescription>added {queuedTimeAgo}</StepDescription>
          </Box>

          <StepSeparator
            height={orientation == 'horizontal' ? '1px !important' : undefined}
            width={orientation == 'vertical' ? '1px !important' : undefined}
          />
        </Step>
        <Step key={2}>
          <StepIndicator
            borderWidth="1px !important"
            borderColor={
              isExecutionFailure
                ? 'red.500'
                : activeStep >= 2
                ? 'teal.500'
                : 'gray.200'
            }
          >
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle>Sign</StepTitle>
            <StepDescription>
              {props.signers?.length || 0} of {props.threshold || 0} signed
              {props.signers?.length > 0 && (
                <Popover trigger="hover">
                  <PopoverTrigger>
                    <InfoOutlineIcon ml={1} transform="translateY(-0.5px)" />
                  </PopoverTrigger>
                  <PopoverContent
                    overflowY={'auto'}
                    overflowX={'hidden'}
                    width="auto"
                    bg="gray.900"
                    borderColor="gray.700"
                  >
                    <PopoverBody pb={1}>
                      {props.signers.map((s) => (
                        <Box key={s} mb={1}>
                          {s}
                        </Box>
                      ))}
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              )}
            </StepDescription>
          </Box>

          <StepSeparator
            opacity={activeStep >= 2 ? 1 : 0.2}
            height={orientation == 'horizontal' ? '1px !important' : undefined}
            width={orientation == 'vertical' ? '1px !important' : undefined}
          />
        </Step>
        <Step key={3}>
          <StepIndicator
            borderWidth="1px !important"
            borderColor={
              isExecutionFailure
                ? 'red.500'
                : activeStep >= 3
                ? 'teal.500'
                : 'gray.200'
            }
          >
            <StepStatus
              complete={isExecutionFailure ? <StepNumber /> : <StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle>Execute</StepTitle>
            <StepDescription>
              {transactionHash ? (
                <>
                  {`${transactionHash.substring(
                    0,
                    6
                  )}...${transactionHash.slice(-4)}`}
                  <Link
                    isExternal
                    styleConfig={{ 'text-decoration': 'none' }}
                    href={getExplorerUrl(
                      props.chainId,
                      transactionHash as viem.Hash
                    )}
                    ml={1}
                  >
                    <ExternalLinkIcon transform="translateY(-0.5px)" />
                  </Link>
                  {isExecutionFailure && <Text>The execution has failed</Text>}
                </>
              ) : (
                <>Pending</>
              )}
            </StepDescription>
          </Box>

          <StepSeparator
            opacity={activeStep >= 3 ? 1 : 0.2}
            height={orientation == 'horizontal' ? '1px !important' : undefined}
            width={orientation == 'vertical' ? '1px !important' : undefined}
          />
        </Step>
        {props.publishable && (
          <Step key={4}>
            <StepIndicator
              borderWidth="1px !important"
              borderColor={activeStep >= 4 ? 'teal.500' : 'gray.200'}
            >
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>

            <Box flexShrink="0">
              <StepTitle>Publish</StepTitle>
              <StepDescription>
                {packageRef ? (
                  <>
                    {packageRef}
                    {packagePublished && (
                      <Link
                        isExternal
                        styleConfig={{ 'text-decoration': 'none' }}
                        href={`/packages/${packageName}/${version}/${props.chainId}-${preset}`}
                        ml={1}
                      >
                        <ExternalLinkIcon transform="translateY(-0.5px)" />
                      </Link>
                    )}
                  </>
                ) : (
                  <Spinner size="xs" />
                )}
              </StepDescription>
            </Box>

            <StepSeparator
              opacity={activeStep >= 4 ? 1 : 0.2}
              height={
                orientation == 'horizontal' ? '1px !important' : undefined
              }
              width={orientation == 'vertical' ? '1px !important' : undefined}
            />
          </Step>
        )}
      </Stepper>
    </>
  );
}
