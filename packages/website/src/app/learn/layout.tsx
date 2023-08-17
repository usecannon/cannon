'use client';

import { ReactNode } from 'react';
import { Box, Flex, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Box bg="black" borderBottom="1px solid" borderColor="gray.700" p={4}>
        <Flex
          gap={8}
          alignItems="center"
          flexWrap="wrap"
          justifyContent="center"
        >
          <Link
            href={links.LEARN}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Overview
          </Link>
          <Link
            href={links.GETSTARTED}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Get Started
          </Link>
          <Link
            href={links.TECHNICALREFERENCE}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Tech Reference
          </Link>
          <Link
            href={links.CANNONFILESPEC}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Cannonfile Spec
          </Link>
        </Flex>
      </Box>
      {children}
    </>
  );
}
