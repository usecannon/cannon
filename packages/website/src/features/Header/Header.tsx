'use client';

import React from 'react';
import {
  Flex,
  IconButton,
  Image,
  Box,
  Tag,
  Icon,
  useBreakpoint,
} from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { ConnectWallet } from './ConnectWallet';
import { useRouter } from 'next/router';
import { SearchBar } from './SearchBar';

const NavLinks = () => {
  const pathname = useRouter().pathname;
  return (
    <Flex
      width={['auto', 'auto', 'auto']}
      gap={8}
      alignItems="center"
      flexWrap="wrap"
      justifyContent="center"
    >
      <NavLink href={links.EXPLORE} isActive={pathname.startsWith('/packages')}>
        Explore
      </NavLink>
      <NavLink href={links.DEPLOY} isActive={pathname.startsWith('/deploy')}>
        Deploy
      </NavLink>
      <NavLink href={links.LEARN} isActive={pathname.startsWith('/learn')}>
        Learn
      </NavLink>
    </Flex>
  );
};

const SettingsButton = () => {
  const pathname = useRouter().pathname;
  return (
    <IconButton
      as={Link}
      href={links.SETTINGS}
      size="sm"
      variant="outline"
      background={pathname.startsWith('/settings') ? 'teal.900' : 'black'}
      borderColor={pathname.startsWith('/settings') ? 'teal.700' : 'gray.500'}
      aria-label="Settings"
      _hover={{
        background: pathname.startsWith('/settings') ? 'teal.900' : 'teal.900',
        borderColor: pathname.startsWith('/settings') ? 'teal.700' : 'teal.500',
      }}
      icon={
        <Icon viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="white"
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          ></path>
          <circle fill="none" stroke="white" cx="12" cy="12" r="3"></circle>
        </Icon>
      }
    />
  );
};

export const Header = () => {
  const breakpoint = useBreakpoint({ ssr: false });

  return (
    <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
      <Flex align="center" pt={[4, 4, 0]} px={3} flexWrap="wrap">
        <Link
          href={links.HOMEPAGE}
          color="white"
          as={NextLink}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          display={['block', 'block', 'inline']}
        >
          <Flex gap={1} alignItems="center">
            <Image
              src="/images/logo.svg"
              alt="Cannon"
              h="28px"
              w="148px"
              objectFit="cover"
            />
          </Flex>
        </Link>
        <Tag
          size="sm"
          variant="outline"
          textTransform="uppercase"
          ml={3}
          letterSpacing="1px"
          fontFamily="var(--font-miriam)"
          pt={0.5}
        >
          Beta
        </Tag>
        {(breakpoint == 'xl' || breakpoint == '2xl') && (
          <>
            <Box ml="auto">
              <SearchBar />
            </Box>
            <Box ml="auto" mr="8">
              <NavLinks />
            </Box>
            <ConnectWallet />
            <Box ml={3}>
              <SettingsButton />
            </Box>
          </>
        )}
        {(breakpoint == 'lg' || breakpoint == 'md') && (
          <>
            <Box ml="auto" mr="8">
              <NavLinks />
            </Box>
            <ConnectWallet />
            <Box ml={3}>
              <SearchBar />
            </Box>
            <Box ml={3}>
              <SettingsButton />
            </Box>
          </>
        )}
        {(breakpoint == 'base' || breakpoint == 'sm') && (
          <>
            <Box ml="auto">
              <ConnectWallet />
            </Box>
            <Flex w="100%" alignItems="center">
              <NavLinks />
              <Box ml="auto">
                <SearchBar />
              </Box>
              <Box ml={3}>
                <SettingsButton />
              </Box>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
};
