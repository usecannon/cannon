'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { SafeAddressInput } from '@/features/Deploy/SafeAddressInput';
import ClientOnly from '@/components/ClientOnly';
import { useParams } from 'next/navigation';
import PageLoading from '@/components/PageLoading';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

const NoSSRWithSafe = dynamic(() => import('@/features/Deploy/WithSafe'), {
  ssr: false,
});

export default function DeployLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = useRouter().pathname;

  const isLarge = useBreakpointValue({ base: false, lg: true });

  if (params == null) {
    return <PageLoading />;
  }

  return (
    <Flex flexDir="column" width="100%">
      {/* Header */}
      <Box
        bg="black"
        borderBottom="1px solid"
        borderColor="gray.700"
        className="sticky top-[var(--header-height)]"
      >
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
            <ClientOnly>
              <SafeAddressInput />
            </ClientOnly>
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
              {isLarge && 'Queue '} Deployment
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

      {/* Body */}
      <SidebarLayout hasSubheader centered>
        <NoSSRWithSafe>{children}</NoSSRWithSafe>
      </SidebarLayout>
    </Flex>
  );
}
