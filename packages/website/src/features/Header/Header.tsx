'use client';
import React, { ReactNode } from 'react';
import {
  Button,
  Heading,
  Flex,
  Image,
  Spacer,
  Container,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverBody,
  Link as ChakraLink,
  Box,
} from '@chakra-ui/react';
import { Link } from '@chakra-ui/next-js';
import { TriangleDownIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { links } from '@/constants/links';

interface SubnavLinkProps {
  href: string;
  children: ReactNode;
  isLast?: boolean;
}

const SubnavLink: React.FC<SubnavLinkProps> = ({
  href,
  children,
  isLast = false,
}) => {
  return (
    <ChakraLink
      fontSize="sm"
      textDecoration="none"
      _hover={{
        textDecoration: 'none',
        background: 'whiteAlpha.50',
      }}
      px={3}
      fontWeight={600}
      isExternal
      py={2}
      display="block"
      href={href}
      borderBottom={isLast ? '' : '1px solid'}
      borderColor={isLast ? '' : 'blackAlpha.600'}
    >
      {children}
    </ChakraLink>
  );
};

export const Header = () => {
  return (
    <Container maxW="container.lg">
      <Flex
        maxWidth="container.lg"
        align="center"
        mx="auto"
        pt={4}
        flexWrap="wrap"
      >
        <Link
          href={links.HomePage}
          color="white"
          as={NextLink}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
        >
          <Flex gap={1} alignItems="center">
            <Image
              src="/images/logo.svg"
              alt="Cannon Logo"
              boxSize="48px"
              objectFit="cover"
            />
            <Heading as="h1" fontWeight="bold" size="lg">
              CANNON
            </Heading>
          </Flex>
        </Link>
        <Spacer />
        <Flex gap={8} alignItems="center" flexWrap="wrap">
          <Link
            href={links.EXPLORE}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            fontFamily="var(--font-miriam)"
          >
            Explore
          </Link>
          <Popover trigger="hover">
            <PopoverTrigger>
              <Box
                color="white"
                textTransform="uppercase"
                fontFamily="var(--font-miriam)"
                cursor="default"
              >
                Tools{' '}
                <TriangleDownIcon
                  boxSize={2}
                  transform="translateY(-1px)"
                  opacity={0.8}
                  ml={0.5}
                />
              </Box>
            </PopoverTrigger>
            <PopoverContent
              width="150px"
              overflow="hidden"
              borderColor="blackAlpha.800"
              boxShadow="0px 10px 25px rgba(0, 0, 0, 0.6)"
            >
              <PopoverBody p="0" background="blue.975">
                <SubnavLink href="https://www.npmjs.com/package/@usecannon/cli">
                  Cannon CLI
                </SubnavLink>
                <SubnavLink href="https://deploy.usecannon.com">
                  Cannon Deployer
                </SubnavLink>
                <SubnavLink href="https://ipfs.usecannon.com" isLast>
                  IPFS Manager
                </SubnavLink>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <Link
            href={links.DOCS}
            color="white"
            as={NextLink}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            textTransform="uppercase"
            fontFamily="var(--font-miriam)"
          >
            Docs
          </Link>
          <Link href={links.GET_STARTED} color="white" as={NextLink}>
            <Button colorScheme="teal" size="sm">
              Get Started
            </Button>
          </Link>
        </Flex>
      </Flex>
    </Container>
  );
};
