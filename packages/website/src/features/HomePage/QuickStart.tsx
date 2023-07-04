import { CommandPreview } from '@/components/CommandPreview';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import styles from './quickStart.module.scss';
import { links } from '@/constants/links';

export const QuickStart = () => {
  return (
    <Box className={styles.wrapper}>
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
        <Link href={links.EXPLORE} color="white" as={NextLink}>
          Browse packages
        </Link>
        &nbsp;for other protocols you can use with Cannon.
      </Text>
    </Box>
  );
};
