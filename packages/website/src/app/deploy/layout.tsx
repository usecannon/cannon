'use client';

import { ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import WithSafe from '@/features/Deploy/WithSafe';

export default function DeployLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isMobile = useBreakpointValue([true, true, false]);

  return (
    <Flex flexDir="column" width="100%">
      <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
        <Flex
          gap={8}
          alignItems="center"
          flexWrap="nowrap"
          justifyContent="center"
          overflowX="auto"
          overflowY="hidden"
          whiteSpace="nowrap"
        >
          <NavLink
            isSmall
            href={links.DEPLOY}
            isActive={links.DEPLOY == pathname}
          >
            {isMobile ? 'Sign' : 'Sign & Execute'}
          </NavLink>
          <NavLink
            isSmall
            href={links.QUEUETXS}
            isActive={pathname.startsWith(links.QUEUETXS)}
          >
            {isMobile ? 'Queue' : 'Queue Transactions'}
          </NavLink>
          <NavLink
            isSmall
            href={links.QUEUEFROMGITOPS}
            isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
          >
            {isMobile ? 'Build' : 'Queue Build'}
          </NavLink>
        </Flex>
      </Box>
      <WithSafe>{children}</WithSafe>
    </Flex>
  );
}
