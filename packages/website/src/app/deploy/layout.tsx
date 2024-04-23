'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { SafeAddressInput } from '@/features/Deploy/SafeAddressInput';
import QueueDrawer from '@/features/Deploy/QueueDrawer';

const NoSSRWithSafe = dynamic(() => import('@/features/Deploy/WithSafe'), {
  ssr: false,
});

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
          justifyContent="between"
          whiteSpace="nowrap"
        >
          <Box
            p={2}
            w="100%"
            maxW={{ lg: 'container.sm' }}
            mb={{ base: 2, lg: 0 }}
          >
            <SafeAddressInput />
          </Box>
          <Flex
            gap={4}
            alignItems="end"
            justifyContent="end"
            grow={1}
            px={4}
            pt={4}
          >
            <NavLink
              isSmall
              href={links.QUEUEFROMGITOPS}
              isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
            >
              Stage
            </NavLink>
            <NavLink
              isSmall
              href={links.DEPLOY}
              isActive={
                links.DEPLOY == pathname ||
                pathname.startsWith(links.DEPLOY + '/txn')
              }
            >
              Sign
            </NavLink>
          </Flex>
        </Flex>
      </Box>
      <NoSSRWithSafe>
        {children}
        <QueueDrawer />
      </NoSSRWithSafe>
    </Flex>
  );
}
