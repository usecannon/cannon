import { useMemo } from 'react';
import { ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useCannonPackage } from '@/hooks/cannon';
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Link as ChakraLink,
  LinkBox,
  LinkOverlay,
  Image,
  Spinner,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { getSafeUrl } from '@/hooks/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { useTxnStager } from '@/hooks/backend';
import { GitHub } from 'react-feather';

interface Params {
  safe: SafeDefinition;
  tx: SafeTransaction;
  hideExternal: boolean;
  isStaged?: boolean;
}

const useTxnAdditionalData = ({
  safe,
  tx,
  isStaged,
}: {
  safe: SafeDefinition;
  tx: SafeTransaction;
  isStaged?: boolean;
}) => {
  const useTxnData = isStaged ? useTxnStager : () => ({});
  return useTxnData(tx, { safe: safe }) as any;
};

// Note: If signatures is provided, additional data will be fetched
export function Transaction({ safe, tx, hideExternal, isStaged }: Params) {
  const stager = useTxnAdditionalData({ safe, tx, isStaged });
  const hintData = parseHintedMulticall(tx.data);

  // get the package referenced by this ipfs package
  const { resolvedName, resolvedVersion, resolvedPreset } = useCannonPackage(
    hintData?.cannonPackage
  );

  const sigHash = useMemo(
    () => hintData && getSafeTransactionHash(safe, tx),
    [safe, tx]
  );

  const isLink = sigHash != null;

  return (
    <LinkBox
      as={Flex}
      display={hideExternal && !isLink ? 'none' : 'flex'}
      mb="4"
      p="4"
      border="1px solid"
      bg="blackAlpha.500"
      borderColor="gray.600"
      borderRadius="md"
      alignItems="center"
      shadow="lg"
      transition="all 0.2s"
      _hover={{ shadow: 'xl', bg: 'blackAlpha.600' }}
    >
      <Flex alignItems={'center'} gap={5} w="100%">
        {hintData?.type === 'deploy' ? (
          <GitHub size="24" strokeWidth={1} />
        ) : hintData?.type === 'invoke' ? (
          <Image
            alt="Cannon Logomark"
            height="24px"
            src="/images/cannon-logomark.svg"
          />
        ) : (
          <Image
            alt="Safe Logomark"
            height="24px"
            src="/images/safe-logomark.svg"
          />
        )}
        <Heading size="md" display="inline-block" minWidth="40px">
          #{tx._nonce}
        </Heading>
        {hintData?.cannonPackage ? (
          <>
            {hintData.isSinglePackage &&
              (!resolvedName ? (
                <Spinner size="xs" opacity={0.8} />
              ) : (
                <Text color="gray.300">
                  {isStaged
                    ? hintData.type == 'deploy'
                      ? 'Building '
                      : 'Staged with '
                    : hintData.type == 'deploy'
                    ? 'Built '
                    : 'Executed with '}
                  {`${resolvedName}:${resolvedVersion}@${resolvedPreset}`}
                </Text>
              ))}
          </>
        ) : (
          <Text color="gray.300">Executed without Cannon</Text>
        )}

        <Flex alignItems="center" ml="auto">
          {isStaged && Object.keys(stager).length && (
            <Text color="gray.300">
              {stager.existingSigners.length} of{' '}
              {stager.requiredSigners.toString()} signed
            </Text>
          )}
          <Box pl="2">
            {isLink ? (
              <LinkOverlay
                as={NextLink}
                href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
              >
                <ChevronRightIcon boxSize={8} mr={1} />
              </LinkOverlay>
            ) : (
              <LinkOverlay
                as={ChakraLink}
                href={`${getSafeUrl(safe, '/transactions/tx')}&id=${
                  tx.safeTxHash
                }`}
                isExternal
              >
                <IconButton
                  color="white"
                  variant="link"
                  transform="translateY(1px)"
                  aria-label={`View Transaction #${tx._nonce}`}
                  icon={<ExternalLinkIcon />}
                />
              </LinkOverlay>
            )}
          </Box>
        </Flex>
      </Flex>
    </LinkBox>
  );
}
