'use client';
import { Box, Button, Container, Heading, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';

export default function HomePage() {
  return (
    <Box height="100%" flex={1} bg="black" py={4}>
      <Container maxW="container.xl" py={[12, 12, 24]}>
        <Heading
          as="h1"
          mb={7}
          fontFamily="var(--font-inter)"
          fontWeight={400}
          fontSize={['32px', '32px', '64px']}
          lineHeight={['38px', '38px', '76px']}
          letterSpacing={['-2.1px', '-2.1px', '-4.2px']}
          textShadow="0px 0px 6px rgba(63, 211, 203, 0.5);"
          maxWidth="800px"
        >
          Cannon manages protocol deployments on blockchains
        </Heading>
        <Heading
          as="h2"
          mb={10}
          fontFamily="var(--font-inter)"
          fontWeight={200}
          fontSize={['18px', '18px', '36px']}
          lineHeight={['23px', '23px', '46px']}
          letterSpacing={['-0.8px', '-0.8px', '-1.6px']}
          color="gray.300"
          maxW="680px"
        >
          Deploy protocols and publish packages to the registry, hosted on
          Ethereum and IPFS.
        </Heading>
        <Link href={links.LEARN} color="white" as={NextLink}>
          <Button colorScheme="teal" size="lg" letterSpacing="0.5px">
            Learn more
          </Button>
        </Link>
      </Container>
    </Box>
  );
}
