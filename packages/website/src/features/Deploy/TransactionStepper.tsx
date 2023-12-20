import {
  Box,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
} from '@chakra-ui/react';
import _ from 'lodash';

const steps = [
  { title: 'Queue', description: 'added 1/2/32 23:23' },
  { title: 'Sign', description: '2 of 3' },
  { title: 'Execute', description: 'Transaction Hash' },
  { title: 'Publish', description: 'Package Name' },
];

export function TransactionStepper(props: {}) {
  const { activeStep } = useSteps({
    index: 1,
    count: steps.length,
  });

  return (
    <>
      {/*
      <Box display="none">
        {hintData && (
          <Box borderRadius="lg" bg="blackAlpha.300" ml="6" py="4" px="6">
            <FormControl>
              {hintData.type === 'deploy' && (
                <Tooltip label="Added using 'Queue From GitOps'">
                  <Tag textTransform="uppercase" size="md">
                    <Text as="b">GitOps</Text>
                  </Tag>
                </Tooltip>
              )}

              {hintData.type === 'invoke' && (
                <Tooltip label="Added using 'Queue Transactions'">
                  <Tag textTransform="uppercase" size="md">
                    <Text as="b">Deployer</Text>
                  </Tag>
                </Tooltip>
              )}

              {hintData.type !== 'deploy' && hintData.type !== 'invoke' && (
                <Tooltip label="Added using the Safe{Wallet} UI">
                  <Tag textTransform="uppercase" size="md">
                    <Text as="b">External</Text>
                  </Tag>
                </Tooltip>
              )}
            </FormControl>
          </Box>
        )}

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

        <Badge
          opacity={0.8}
          colorScheme={status == 'executed' ? 'green' : 'blue'}
        >
          {status}
        </Badge>
      </Box>
              */}

      <Stepper size="sm" index={activeStep}>
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIndicator>
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
                {step.title}
              </StepTitle>
              <StepDescription color="gray.300">
                {step.description}
              </StepDescription>
            </Box>

            <StepSeparator />
          </Step>
        ))}
      </Stepper>
    </>
  );
}
