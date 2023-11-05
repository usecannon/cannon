'use client';

import { ReactNode } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Link,
  useBreakpointValue,
} from '@chakra-ui/react';
import { some, omit } from 'lodash';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { useStore } from '@/helpers/store';
import UnderConstruction from '@/features/Packages/Tabs/UnderConstruction';

export default function DeployLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const settings = useStore((s) => s.settings);

  const missingSettings = some(
    omit(settings, 'forkProviderUrl'),
    (value) => !value
  );

  const showSettingsAlert =
    (pathname.includes('/transactions') || pathname.includes('/gitops')) &&
    missingSettings;

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
            {isMobile ? 'Sign Txs' : 'Sign Transactions'}
          </NavLink>
          <NavLink
            isSmall
            href={links.QUEUETXS}
            isActive={pathname.startsWith(links.QUEUETXS)}
          >
            {isMobile ? 'Queue Txs' : 'Queue Transactions'}
          </NavLink>
          <NavLink
            isSmall
            href={links.QUEUEFROMGITOPS}
            isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
          >
            {isMobile ? 'GitOps' : 'Queue From GitOps'}
          </NavLink>
        </Flex>
      </Box>
      {showSettingsAlert && (
        <Alert bg="gray.700">
          <Flex mx="auto" flexWrap="wrap" justifyContent="center">
            <AlertIcon />
            You must{' '}
            <Link
              mx="1"
              fontWeight="medium"
              textDecoration="underline"
              as={NextLink}
              href={links.SETTINGS}
            >
              update your settings
            </Link>{' '}
            to queue transactions.
          </Flex>
        </Alert>
      )}
      <UnderConstruction />
      {children}
    </Flex>
  );
}
