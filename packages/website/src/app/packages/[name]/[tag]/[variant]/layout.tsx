'use client';

import { ReactNode } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  useBreakpointValue,
} from '@chakra-ui/react';
import { NavLink } from '@/components/NavLink';
import { Ipfs } from '@/components/Ipfs';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { VersionSelect } from '@/features/Packages/VersionSelect';

import { useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePathname } from 'next/navigation';

export default function PackageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { name: string; tag: string; variant: string };
}) {
  const { data } = useQuery<any, any>(GET_PACKAGE, {
    variables: { name: params.name },
  });

  const [pkg, setPackage] = useState<any | null>(null);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const currentVariant = pkg?.variants.find(
    (variant: any) =>
      variant.name === params.variant && variant.tag.name === params.tag
  );

  const pathname = usePathname();

  const isMobile = useBreakpointValue([true, true, false]);

  return (
    <Flex flexDirection="column" width="100%">
      {pkg ? (
        <>
          <Box
            bg="black"
            pt={12}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Flex
                flexDirection={['column', 'column', 'row']}
                alignItems={['left', 'left', 'center']}
                mb={5}
              >
                <Box>
                  <Heading as="h1" size="lg" mb="2">
                    {pkg?.name}
                  </Heading>
                  <PublishInfo p={pkg} />
                </Box>
                <Box ml={[0, 0, 'auto']} mt={[6, 6, 0]}>
                  <VersionSelect pkg={pkg} currentVariant={currentVariant} />
                </Box>
              </Flex>
              {isMobile && (
                <Box mb={1}>
                  <Ipfs href="ipfs://qMabcd1234abcd1234" />
                </Box>
              )}
              <Flex gap={8} alignItems="center">
                <NavLink
                  isActive={
                    pathname ==
                    `/packages/${pkg.name}/${params.tag}/${params.variant}`
                  }
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}`}
                  isSmall
                >
                  Deployment
                </NavLink>
                <NavLink
                  isActive={
                    pathname ==
                    `/packages/${pkg.name}/${params.tag}/${params.variant}/code`
                  }
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}/code`}
                  isSmall
                >
                  Code
                </NavLink>
                <NavLink
                  isActive={
                    pathname ==
                    `/packages/${pkg.name}/${params.tag}/${params.variant}/interact`
                  }
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}/interact`}
                  isSmall
                >
                  Interact
                </NavLink>
                {!isMobile && (
                  <Box ml="auto">
                    <Ipfs href="ipfs://qMabcd1234abcd1234" />
                  </Box>
                )}
              </Flex>
            </Container>
          </Box>
          {children}
        </>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
}
