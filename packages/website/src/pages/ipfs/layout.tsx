'use client';

import { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';

export default function DeployLayout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;

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
            href={links.IPFS_DOWNLOAD}
            isActive={pathname == links.IPFS_DOWNLOAD}
          >
            Download
          </NavLink>
          <NavLink
            isSmall
            href={links.IPFS_UPLOAD}
            isActive={pathname.startsWith(links.IPFS_UPLOAD)}
          >
            Upload
          </NavLink>
        </Flex>
      </Box>
      {children}
    </Flex>
  );
}
