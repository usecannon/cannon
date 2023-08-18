'use client';
import React from 'react';
import { Flex, Image, Spacer, Box } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';

export const Header = () => {
  return (
    <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
      <Flex align="center" mx="auto" pt={[4, 4, 0]} px={4} flexWrap="wrap">
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
        <Spacer display={['none', 'none', 'block']} />
        <Box display={['block', 'block', 'none']} w="100%" />
        <Box width={['100%', '100%', 'auto']} mt={[1, 1, 0]}>
          <Flex
            gap={8}
            alignItems="center"
            flexWrap="wrap"
            justifyContent="center"
          >
            <NavLink href={links.EXPLORE}>Explore</NavLink>
            <NavLink href={'https://deploy.usecannon.com'}>Deploy</NavLink>
            <NavLink href={links.LEARN}>Learn</NavLink>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};
