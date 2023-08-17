'use client';

import { ReactNode } from 'react';
import { Box, Flex, Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';

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
          <NavLink href={links.LEARN}>Overview</NavLink>
          <NavLink href={links.GETSTARTED}>Get Started</NavLink>
          <NavLink href={links.TECHNICALREFERENCE}>Tech Reference</NavLink>
          <NavLink href={links.CANNONFILESPEC}>Cannonfile Spec</NavLink>
        </Flex>
      </Box>
      {children}
    </>
  );
}
