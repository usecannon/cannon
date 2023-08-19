'use client';

import { ReactNode } from 'react';
import { Box, Container, Flex, Heading, Spinner } from '@chakra-ui/react';
import { NavLink } from '@/components/NavLink';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { VersionSelect } from '@/features/Packages/VersionSelect';

import { useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import {
  GetPackageQuery,
  GetPackageQueryVariables,
  GetPackagesQuery,
} from '@/types/graphql/graphql';
import { useQuery } from '@apollo/client';

type Package = GetPackagesQuery['packages'][0];

export default function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { name: string; tag: string; variant: string };
}) {
  const { data } = useQuery<GetPackageQuery, GetPackageQueryVariables>(
    GET_PACKAGE,
    {
      variables: { name: params.name },
    }
  );

  const [pkg, setPackage] = useState<Package | null>(null);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  return (
    <Flex flexDirection="column" width="100%">
      {pkg ? (
        <>
          <Box
            bg="black"
            pt={12}
            mb={8}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Flex alignItems="center" mb={5}>
                <Box>
                  <Heading as="h1" size="lg" mb="2">
                    {pkg?.name}
                  </Heading>
                  <PublishInfo p={pkg} />
                </Box>
                <Box ml="auto">
                  <VersionSelect pkg={pkg} />
                </Box>
              </Flex>
              <Flex gap={8}>
                <NavLink
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}`}
                  isSmall
                >
                  Deployment
                </NavLink>
                <NavLink
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}/code`}
                  isSmall
                >
                  Code
                </NavLink>
                <NavLink
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}/interact`}
                  isSmall
                >
                  Interact
                </NavLink>
              </Flex>
            </Container>
          </Box>
          {children}
        </>
      ) : (
        <Spinner m="auto" />
      )}
    </Flex>
  );
}
