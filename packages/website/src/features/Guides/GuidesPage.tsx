'use client';

import React from 'react';
import { links } from '@/constants/links';
import NextLink from 'next/link';
import {
  Container,
  Flex,
  Text,
  Grid,
  GridItem,
  Heading,
  Link,
  useTheme,
} from '@chakra-ui/react';

interface GuideCardProps {
  href?: string;
  title?: string;
  subtitle: string;
}

const GuideCard: React.FC<GuideCardProps> = ({ href, title, subtitle }) => {
  return (
    <GridItem>
      <Link
        as={href ? NextLink : Text}
        href={href}
        cursor={href ? 'pointer' : 'default'}
        textDecoration="none !important"
      >
        <Flex
          border="1px solid"
          borderColor="gray.800"
          borderRadius="md"
          background="gray.900"
          p={5}
          minHeight="178px"
          flexDirection="column"
          justifyContent="flex-end"
          transition={'all 0.2s'}
          _hover={{
            background: 'whiteAlpha.100',
            boxShadow: '0px 0px 12px rgba(0,0,0,0.5)',
          }}
        >
          {title && (
            <Heading mb="2" size="lg">
              {title}
            </Heading>
          )}
          <Heading
            color={href ? 'gray.300' : 'gray.500'}
            size="sm"
            fontWeight={400}
          >
            {subtitle}
          </Heading>
        </Flex>
      </Link>
    </GridItem>
  );
};

export const GuidesPage = () => {
  const theme = useTheme();

  return (
    <Flex
      background={theme.gradients.dark}
      backgroundAttachment="fixed"
      flex="1"
      py={[4, 4, 8]}
      p={4}
    >
      <Container maxW="container.lg">
        <Grid
          templateColumns={[
            'repeat(1, 1fr)',
            'repeat(1, 1fr)',
            'repeat(2, 1fr)',
            'repeat(3, 1fr)',
          ]}
          gap={[4, 4, 8]}
          py={[4, 4, 8]}
        >
          <GuideCard
            href={links.GETSTARTED}
            title="Get Started"
            subtitle="Run a package from the package explorer on a local node in seconds"
          />
          <GuideCard
            href={links.BUILD}
            title="Build a Protocol"
            subtitle="Create and deploy a protocol that integrates with Cannon packages"
          />
          <GuideCard
            href={links.ROUTER}
            title="Deploy a Router"
            subtitle="Build a protocol of any size with Synthetix’s Router plug-in"
          />
          <GuideCard
            href={links.DEBUG}
            title="Debugging Tips"
            subtitle="Use the decode, trace, and interact commands to troubleshoot"
          />
        </Grid>
      </Container>
    </Flex>
  );
};
