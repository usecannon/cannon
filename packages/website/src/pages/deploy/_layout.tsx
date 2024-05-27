'use client';

import dynamic from 'next/dynamic';
import { ReactNode, Suspense } from 'react';
import { Box, Flex, Spinner, useBreakpointValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { SafeAddressInput } from '@/features/Deploy/SafeAddressInput';

const NoSSRWithSafe = dynamic(() => import('@/features/Deploy/WithSafe'), {
  ssr: false,
});

export default function DeployLayout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;

  const isLarge = useBreakpointValue({ base: false, lg: true });

  return (
    <Flex flexDir="column" width="100%">
      <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
        <Flex
          alignItems="center"
          flexWrap="nowrap"
          justifyContent="between"
          whiteSpace="nowrap"
          direction={['column', 'column', 'column', 'row']}
        >
          <Box
            w="100%"
            maxW={{ lg: 'container.sm' }}
            mb={{ base: 2, lg: 0 }}
            p={1.5}
          >
            <Suspense fallback={<Spinner />}>
              <SafeAddressInput />
            </Suspense>
          </Box>
          <Flex gap={6} alignItems="end" justifyContent="end" grow={1} px={4}>
            <NavLink
              isSmall
              href={links.DEPLOY}
              isActive={
                links.DEPLOY == pathname ||
                pathname.startsWith(links.DEPLOY + '/txn')
              }
            >
              Sign{isLarge && ' Transactions'}
            </NavLink>
            <NavLink
              isSmall
              href={links.QUEUEFROMGITOPS}
              isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
            >
              Queue{isLarge && ' Cannonfile'}
            </NavLink>
            <NavLink
              isSmall
              href={links.QUEUETXS}
              isActive={pathname.startsWith(links.QUEUETXS)}
            >
              Stage{isLarge && ' Transactions'}
            </NavLink>
          </Flex>
        </Flex>
      </Box>
      <NoSSRWithSafe>{children}</NoSSRWithSafe>
    </Flex>
  );
}
