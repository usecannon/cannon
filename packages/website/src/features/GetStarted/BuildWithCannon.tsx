import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';
import { Heading, Text, Box, Link } from '@chakra-ui/react';

export const BuildWithCannon = () => {
  return (
    <>
      <Heading
        as="h2"
        size="lg"
        fontWeight={600}
        letterSpacing="0.2px"
        mb={2.5}
      >
        Build with Cannon
      </Heading>
      <Text
        pb={4}
        mb={4}
        borderBottom="1px solid"
        borderBottomColor="gray.600"
        fontSize="xl"
        color="gray.400"
      >
        Create and deploy a protocol that integrates with Cannon packages
      </Text>
      <Text mb={4}>
        Start by installing/upgrading the Cannon{' '}
        <Link href={links.CLI}>command-line interface</Link>:
      </Text>
      <Box mb={6}>
        <CommandPreview command="npm i -g @usecannon/cli" />
      </Box>
    </>
  );
};
