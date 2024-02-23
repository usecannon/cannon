'use client';

import { FC, ReactNode } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Link,
  useBreakpointValue,
} from '@chakra-ui/react';
import { links } from '@/constants/links';
import { usePathname } from 'next/navigation';

const useCannon = [
  { text: 'Get Started', href: links.GETSTARTED },
  { text: 'Build a Protocol', href: links.BUILD },
  { text: 'Deploy a Router', href: links.ROUTER },
  { text: 'Debugging Tips', href: links.DEBUG },
];

interface CustomLinkProps {
  href: string;
  children: ReactNode;
}

const CustomLink: FC<CustomLinkProps> = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = href == pathname;
  return (
    <Link
      display="block"
      textDecoration="none"
      borderRadius="md"
      mb={0.5}
      py={0.5}
      px="2"
      cursor="pointer"
      fontSize="sm"
      _hover={{ background: 'gray.800' }}
      href={href}
      fontStyle={href == '#' ? 'italic' : 'normal'}
      color={href == '#' ? 'gray.400' : 'inherit'}
      fontWeight={isActive ? 'medium' : undefined}
      background={isActive ? 'gray.800' : undefined}
    >
      {children}
    </Link>
  );
};

interface LinkItem {
  href: string;
  text: string;
}

interface SectionProps {
  title: string;
  links: LinkItem[];
}

const Section: FC<SectionProps> = ({ title, links }) => (
  <Box my={4}>
    <Heading
      fontWeight="500"
      size="sm"
      color="gray.200"
      letterSpacing="0.1px"
      px="2"
      mb="1.5"
    >
      {title}
    </Heading>
    <Box mb={6}>
      {links.map((link, index) => (
        <CustomLink key={index} href={link.href}>
          {link.text}
        </CustomLink>
      ))}
    </Box>
  </Box>
);

export default function LearnLayout({ children }: { children: ReactNode }) {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '200px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderBottom={isSmall ? '1px solid' : 'none'}
          borderColor={isSmall ? 'gray.600' : 'gray.700'}
          width={['100%', '100%', '200px']}
          maxHeight={['140px', '140px', 'calc(100vh - 151px)']}
        >
          <Box px={3} pb={2}>
            <Section title="Use Cannon" links={useCannon} />
            <Section
              title="Build DeFi"
              links={[{ href: '#', text: 'Coming Soon' }]}
            />
          </Box>
        </Flex>

        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 151px)']}
          background="gray.800"
        >
          <Container maxW="container.lg" ml={0} p={8}>
            {children}
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
}
