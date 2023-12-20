import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Link,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useBreakpointValue,
  useSteps,
} from '@chakra-ui/react';
import { formatDistanceToNow } from 'date-fns';
import _ from 'lodash';
import { useMemo } from 'react';

export function TransactionStepper(props: {
  queuedTime: number;
  signers: string[];
  threshold: number;
  transactionHash: string | undefined;
  packageRef: string | undefined;
  packagePublished: boolean;
}) {
  let step = 1;
  if (props.packagePublished) {
    step = 4;
  } else if (props.transactionHash) {
    step = 3;
  } else if (props.signers.length >= props.threshold) {
    step = 2;
  }

  const { activeStep } = useSteps({
    index: step,
    count: !!props.packageRef ? 4 : 3,
  });

  const orientation = useBreakpointValue({
    base: 'vertical' as OrientationType,
    md: 'horizontal' as OrientationType,
  });

  const queuedTimeAgo = useMemo(
    () =>
      formatDistanceToNow(new Date(props.queuedTime * 1000), {
        addSuffix: true,
      }),
    [props.queuedTime]
  );

  let packageName, version, chainId, preset;

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
        colorScheme="teal"
      >
        <Step key={1}>
          <StepIndicator
            borderWidth="1px !important"
            borderColor={activeStep >= 1 ? 'teal.500' : 'gray.200'}
          >
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle
              textTransform={'uppercase'}
              letterSpacing={'1px'}
              fontFamily={'var(--font-miriam)'}
              textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
            >
              Queue
            </StepTitle>
            <StepDescription color="gray.300">
              added {queuedTimeAgo}
            </StepDescription>
          </Box>

          <StepSeparator
            height={orientation == 'horizontal' ? '1px !important' : undefined}
            width={orientation == 'vertical' ? '1px !important' : undefined}
          />
        </Step>
        <Step key={2}>
          <StepIndicator
            borderWidth="1px !important"
            borderColor={activeStep >= 2 ? 'teal.500' : 'gray.200'}
          >
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle
              textTransform={'uppercase'}
              letterSpacing={'1px'}
              fontFamily={'var(--font-miriam)'}
              textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
            >
              Sign
            </StepTitle>
            <StepDescription color="gray.300">
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
            borderColor={activeStep >= 3 ? 'teal.500' : 'gray.200'}
          >
            <StepStatus
              complete={<StepIcon />}
              incomplete={<StepNumber />}
              active={<StepNumber />}
            />
          </StepIndicator>

          <Box flexShrink="0">
            <StepTitle
              textTransform={'uppercase'}
              letterSpacing={'1px'}
              fontFamily={'var(--font-miriam)'}
              textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
            >
              Execute
            </StepTitle>
            <StepDescription color="gray.300">
              {props.transactionHash ? (
                <>
                  {`${props.transactionHash.substring(
                    0,
                    6
                  )}...${props.transactionHash.slice(-4)}`}
                  <Link
                    isExternal
                    styleConfig={{ 'text-decoration': 'none' }}
                    href={`https://etherscan.io/address/${'x'}`}
                    ml={1}
                  >
                    <ExternalLinkIcon transform="translateY(-0.5px)" />
                  </Link>
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
        {!!props.packageRef && (
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
              <StepTitle
                textTransform={'uppercase'}
                letterSpacing={'1px'}
                fontFamily={'var(--font-miriam)'}
                textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
              >
                Publish
              </StepTitle>
              <StepDescription color="gray.300">
                {props.packageRef}
                {props.packagePublished && (
                  <Link
                    isExternal
                    styleConfig={{ 'text-decoration': 'none' }}
                    href={`/packages/${packageName}/${version}/${chainId}-${preset}`}
                    ml={1}
                  >
                    <ExternalLinkIcon transform="translateY(-0.5px)" />
                  </Link>
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
