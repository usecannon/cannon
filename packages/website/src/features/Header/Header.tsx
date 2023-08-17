'use client';
import React from 'react';
import { Button, Flex, Image, Spacer, Container, Box } from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { links } from '@/constants/links';

export const Header = () => {
  return (
    <Box bg="black" borderBottom="1px solid" borderColor="gray.700">
      <Flex align="center" mx="auto" p={4} flexWrap="wrap">
        <Link
          href={links.HomePage}
          color="white"
          as={NextLink}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          mb={[4, 4, 0]}
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
        <Flex gap={8} alignItems="center" flexWrap="wrap">
          <Link
            href={links.EXPLORE}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Explore
          </Link>
          <Link
            href="https://deploy.usecannon.com"
            color="white"
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Deploy
          </Link>
          <Link
            href={links.DOCS}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            letterSpacing="1px"
            fontFamily="var(--font-miriam)"
          >
            Learn
          </Link>
          <Link href={links.GET_STARTED} color="white" as={NextLink}>
            <Button colorScheme="teal" size="sm">
              Get Started
            </Button>
          </Link>
        </Flex>
      </Flex>
    </Box>
  );
};
