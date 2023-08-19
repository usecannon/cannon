'use client';

import { ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';

export default function RootLayout({ children }: { children: ReactNode }) {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flexDir="column" width="100%">
      <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
        <Flex
          gap={[4, 4, 8]}
          alignItems="center"
          flexWrap="nowrap"
          justifyContent="center"
          overflowX="auto"
          whiteSpace="nowrap"
        >
          <NavLink isSmall href={links.LEARN}>
            Overview
          </NavLink>
          <NavLink isSmall href={links.GETSTARTED}>
            Get Started
          </NavLink>
          <NavLink isSmall href={links.TECHNICALREFERENCE}>
            Tech Reference
          </NavLink>
          <NavLink isSmall href={links.CANNONFILESPEC}>
            Cannonfile Spec
          </NavLink>
        </Flex>
      </Box>
      {children}
    </Flex>
  );
}
