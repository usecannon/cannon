import { CommandPreview } from '@/components/CommandPreview';
import { externalLinks } from '@/constants/externalLinks';
import { Heading, Text, Box, Link } from '@chakra-ui/react';

export const BuildWithCannon = () => {
  return (
    <>
      <Heading
        as="h2"
        size="lg"
        fontWeight={600}
        pb={4}
        mb={4}
        borderBottom="1px solid"
        borderBottomColor="gray.800"
        letterSpacing="0.2px"
      >
        Build with Cannon
      </Heading>
      <Text mb={4}>Start by installing/upgrading Cannon:</Text>
      <Box mb={4}>
        <CommandPreview command="npm i -g @usecannon/cli" />
      </Box>
      <Text mb={4}>
        Run the setup command to prepare your development environment:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon setup" />
      </Box>
      <Text mb={5}>
        Cannon relies on IPFS for file storage. You can{' '}
        <Link href={externalLinks.IPFS_INSTALL} isExternal>
          run an IPFS node
        </Link>{' '}
        locally or rely on a remote pinning service (like{' '}
        <Link href={externalLinks.PINATA_IPFS} isExternal>
          Pinata
        </Link>{' '}
        or run your own{' '}
        <Link href={externalLinks.IPFS_CLUSTER} isExternal>
          IPFS cluster
        </Link>
        ). We recommend the former for local development and the latter when
        publishing packages. The setup command will walk you through this
        step-by-step.
      </Text>
    </>
  );
};
