import { Box, Button, Container, Flex, Heading, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import styles from './intro.module.scss';
import { links } from '@/constants/links';

export const Intro = () => {
  return (
    <Box className={styles.wrapper} pt={[0, 0, 12]}>
      <Container maxW="container.lg" py={[12, 12, 24]}>
        <Heading as="h1" mb={4}>
          Cannon manages protocol deployments on blockchains
        </Heading>
        <Heading as="h2" mb={8} fontWeight="normal" size="md">
          &apos;Infrastructure as Code&apos; for Foundry and Hardhat
        </Heading>
        <Flex gap={8} flexWrap="wrap">
          <Link href={links.LEARN} color="white" as={NextLink}>
            <Button colorScheme="teal" size="md">
              Get Started
            </Button>
          </Link>
          <Link href={links.EXPLORE} as={NextLink}>
            <Button colorScheme="white" variant="outline" size="md">
              Browse packages
            </Button>
          </Link>
        </Flex>
      </Container>
    </Box>
  );
};
