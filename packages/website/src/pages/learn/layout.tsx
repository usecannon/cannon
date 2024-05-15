'use client';

import { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { useRouter } from 'next/router';

export default function LearnLayout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;

  return (
    <Flex flexDir="column" width="100%">
      <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
        <Flex
          gap={8}
          alignItems="center"
          flexWrap="nowrap"
          justifyContent="center"
          overflowX="auto"
          whiteSpace="nowrap"
        >
          <NavLink
            isSmall
            href={links.LEARN}
            isActive={links.LEARN == pathname}
          >
            Overview
          </NavLink>
          <NavLink
            isSmall
            href={links.GUIDES}
            isActive={pathname.startsWith(links.GUIDES)}
          >
            Guides
          </NavLink>
          <NavLink
            isSmall
            href={links.CLI}
            isActive={pathname.startsWith(links.CLI)}
          >
            CLI
          </NavLink>
          <NavLink
            isSmall
            href={links.CANNONFILE}
            isActive={pathname.startsWith(links.CANNONFILE)}
          >
            Cannonfiles
          </NavLink>
        </Flex>
      </Box>
      {children}
    </Flex>
  );
}
