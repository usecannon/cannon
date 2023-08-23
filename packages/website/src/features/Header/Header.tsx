'use client';
import React from 'react';
import { Flex, Image, Box, useBreakpointValue } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { ConnectWallet } from './ConnectWallet';
import { usePathname } from 'next/navigation';

const NavLinks = () => {
  const pathname = usePathname();
  return (
    <Flex
      ml={['auto', 'auto', 'auto']}
      mr={['auto', 'auto', 8]}
      width={['100%', '100%', 'auto']}
      gap={8}
      alignItems="center"
      flexWrap="wrap"
      justifyContent="center"
    >
      <NavLink href={links.EXPLORE} isActive={pathname.startsWith('/packages')}>
        Explore
      </NavLink>
      <NavLink href={'https://deploy.usecannon.com'}>Deploy</NavLink>
      <NavLink href={links.LEARN} isActive={pathname.startsWith('/learn')}>
        Learn
      </NavLink>
    </Flex>
  );
};

export const Header = () => {
  const isMobile = useBreakpointValue([true, true, false]);

  return (
    <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
      <Flex align="center" pt={[4, 4, 0]} px={4} flexWrap="wrap">
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
        {!isMobile && <NavLinks />}
        <Box ml={['auto', 'auto', 0]} display="block">
          <ConnectWallet />
        </Box>
        {isMobile && <NavLinks />}
      </Flex>
    </Box>
  );
};
