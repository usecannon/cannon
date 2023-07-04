import { CommandPreview } from '@/components/CommandPreview';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';

export const QuickStart = () => {
  return (
    <>
      <Heading as="h4" size="sm" fontWeight="normal" mb={4}>
        QUICK START
      </Heading>
      <Text mb={1} fontWeight="bold">
        Start a local chain with a deployment of Synthetix
      </Text>
      <Box mb={4}>
        <CommandPreview command="npx @usecannon/cli synthetix-sandbox" />
      </Box>
      <Text fontSize="xs">
        <Link
          href="/docs"
          color="white"
          as={NextLink}
          textDecoration="underline"
        >
          Browse packages
        </Link>
        &nbsp;for other protocols you can use with Cannon.
      </Text>
    </>
  );
};
