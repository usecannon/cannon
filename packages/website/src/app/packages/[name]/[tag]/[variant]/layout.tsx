'use client';

import { ReactNode } from 'react';
import { Box, Container, Flex, Heading } from '@chakra-ui/react';
import { NavLink } from '@/components/NavLink';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { VersionSelect } from '@/features/Packages/VersionSelect';
import { IpfsLinks } from '@/features/Packages/IpfsLinks';

import { useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePathname } from 'next/navigation';

export default function PackageLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { name: string; tag: string; variant: string };
}) {
  params = {
    name: decodeURIComponent(params.name),
    tag: decodeURIComponent(params.tag),
    variant: decodeURIComponent(params.variant),
  };

  const { data } = useQueryCannonSubgraphData<any, any>(GET_PACKAGE, {
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
                  <PublishInfo p={currentVariant} />
                </Box>
                <Box ml={[0, 0, 'auto']} mt={[6, 6, 0]}>
                  <VersionSelect pkg={pkg} currentVariant={currentVariant} />
                </Box>
              </Flex>
              <Flex gap={8} align="center" maxW="100%" overflowX="auto">
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
                  isActive={pathname.startsWith(
                    `/packages/${pkg.name}/${params.tag}/${params.variant}/interact`
                  )}
                  href={
                    pathname.startsWith(
                      `/packages/${pkg.name}/${params.tag}/${params.variant}/interact`
                    )
                      ? pathname
                      : `/packages/${pkg.name}/${params.tag}/${params.variant}/interact`
                  }
                  isSmall
                >
                  Interact
                </NavLink>
                <NavLink
                  isActive={
                    pathname ==
                    `/packages/${pkg.name}/${params.tag}/${params.variant}/cannonfile`
                  }
                  href={`/packages/${pkg.name}/${params.tag}/${params.variant}/cannonfile`}
                  isSmall
                >
                  Cannonfile
                </NavLink>
                <Box ml="auto">
                  <IpfsLinks variant={currentVariant} />
                </Box>
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
