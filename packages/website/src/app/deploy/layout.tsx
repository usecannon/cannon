'use client';

import dynamic from 'next/dynamic';
import { ReactNode, Suspense } from 'react';
import { Box, Flex, Spinner } from '@chakra-ui/react';
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
          <Box w="100%" maxW={{ lg: 'container.sm' }} mb={{ base: 2, lg: 0 }} pl={1.5}>
            <Suspense fallback={<Spinner />}>
              <SafeAddressInput />
            </Suspense>
          </Box>
          <Flex gap={6} alignItems="end" justifyContent="end" grow={1} px={4}>
            <NavLink
              isSmall
              href={links.QUEUEFROMGITOPS}
              isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
            >
              Stage Transactions
            </NavLink>
            <NavLink
              isSmall
              href={links.DEPLOY}
              isActive={
                links.DEPLOY == pathname ||
                pathname.startsWith(links.DEPLOY + '/txn')
              }
            >
              Sign Transactions
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
