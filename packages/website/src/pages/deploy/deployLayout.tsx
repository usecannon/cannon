'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { SafeAddressInput } from '@/features/Deploy/SafeAddressInput';
import ClientOnly from '@/components/ClientOnly';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useParams } from 'next/navigation';

const NoSSRWithSafe = dynamic(() => import('@/features/Deploy/WithSafe'), {
  ssr: false,
});

export default function DeployLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const isLarge = useBreakpointValue({ base: false, lg: true });

  const isSafeUrl = router.pathname.includes('/deploy/[chainId]/[safeAddress]');
  const isGitOpsPage =
    router.pathname === '/deploy/[chainId]/[safeAddress]/gitops';
  const isQueuePage =
    router.pathname === '/deploy/[chainId]/[safeAddress]/queue';
  const isTxnPage = router.pathname === '/deploy/[chainId]/[safeAddress]/txn';

  return (
    <Flex flexDir="column" width="100%">
      {params !== null ? (
        <>
          {/* Header */}
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
                <ClientOnly>
                  <SafeAddressInput />
                </ClientOnly>
              </Box>
              {isSafeUrl && (
                <Flex
                  gap={6}
                  alignItems="end"
                  justifyContent="end"
                  grow={1}
                  px={4}
                >
                  <NavLink isSmall href={links.DEPLOY} isActive={isGitOpsPage}>
                    Sign{isLarge && ' Transactions'}
                  </NavLink>
                  <NavLink
                    isSmall
                    href={links.QUEUEFROMGITOPS}
                    isActive={isQueuePage}
                  >
                    {isLarge && 'Queue '} Deployment
                  </NavLink>
                  <NavLink isSmall href={links.QUEUETXS} isActive={isTxnPage}>
                    Stage{isLarge && ' Transactions'}
                  </NavLink>
                </Flex>
              )}
            </Flex>
          </Box>

          {/* Body */}
          <NoSSRWithSafe>{children}</NoSSRWithSafe>
        </>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
}
