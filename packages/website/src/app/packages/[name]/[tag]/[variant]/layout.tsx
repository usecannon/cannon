'use client';

import { ReactNode } from 'react';
import { Box, Container, Flex, Heading } from '@chakra-ui/react';
import { NavLink } from '@/components/NavLink';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { VersionSelect } from '@/features/Packages/VersionSelect';

import { useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { CustomSpinner } from '@/components/CustomSpinner';

export default function RootLayout({
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
                  <VersionSelect pkg={pkg} currentVariant={currentVariant} />
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
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
}
