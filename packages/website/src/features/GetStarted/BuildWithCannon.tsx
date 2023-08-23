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
      <Text mb={4}>
        Run the setup command to prepare your development environment:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon setup" />
      </Box>
      <Text mb={4}>
        Cannon relies on IPFS for file storage. You can{' '}
        <Link href={externalLinks.IPFS_INSTALL}>run an IPFS node</Link>
        locally or rely on a remote pinning service (such as{' '}
        <Link href={externalLinks.INFURA_IPFS}>Infura</Link>
        ). We recommend the former for local development and the latter when
        publishing packages. The setup command will walk you through this
        step-by-step.
      </Text>
    </>
  );
};
