'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import {
  GetPackageQuery,
  GetPackageQueryVariables,
  GetPackagesQuery,
} from '@/types/graphql/graphql';
import { useQuery } from '@apollo/client';
import {
  Flex,
  Box,
  Heading,
  Spinner,
  Text,
  TabList,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  Container,
} from '@chakra-ui/react';
import PackageNetworks from '@/components/PackageNetworks';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { Cannonfile } from '@/features/Packages/Cannonfile';
import { Versions } from '@/features/Packages/Versions';
import { Interact } from '@/features/Packages/Interact';
//import { NavLink } from '@/components/NavLink';

type Package = GetPackagesQuery['packages'][0];

export const PackagesPage: FC<{ name: string }> = ({ name }) => {
  const { data } = useQuery<GetPackageQuery, GetPackageQueryVariables>(
    GET_PACKAGE,
    {
      variables: { name },
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
            pb={2}
            mb={8}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Heading as="h4" size="md" mb="1">
                {pkg?.name}
              </Heading>
              <Box mb={3}>
                <PublishInfo p={pkg} />
              </Box>
              <Box mb={6}>
                <PackageNetworks download p={pkg!} />
              </Box>
              {/*}
              <NavLink href="./" isSmall>
                Cannonfile
              </NavLink>
              <NavLink href="./interact" isSmall>
                Interact
              </NavLink>
              <NavLink href="./interact" isSmall>
                Versions
              </NavLink>
      */}
            </Container>
          </Box>

          <Container maxW="container.lg">
            <Tabs colorScheme="cyan">
              <TabList>
                <Tab>Cannonfile</Tab>
                <Tab>Interact</Tab>
                <Tab>Versions</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <Cannonfile pkg={pkg} />
                </TabPanel>
                <TabPanel px={0}>
                  <Interact pkg={pkg} />
                </TabPanel>
                <TabPanel px={0}>
                  <Versions pkg={pkg} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Container>
          {/*<Link*/}
          {/*  p="3"*/}
          {/*  // as="nuxt-link"*/}
          {/*  href={`/packages/${p?.name}/`}*/}
          {/*  // exact TODO*/}
          {/*  exact-active-class="active-link"*/}
          {/*  // class="tab-link" TODO*/}
          {/*>*/}
          {/*  Cannonfile*/}
          {/*</Link>*/}
          {/*<Link*/}
          {/*  p="3"*/}
          {/*  // as="nuxt-link"*/}
          {/*  href={`/packages/${p?.name}/interact`}*/}
          {/*  active-class="active-link"*/}
          {/*  // class="tab-link" TODO*/}
          {/*>*/}
          {/*  Interact*/}
          {/*</Link>*/}
          {/*<Link*/}
          {/*  p="3"*/}
          {/*  // as="nuxt-link"*/}
          {/*  href={`/packages/${p?.name}/versions`}*/}
          {/*  active-class="active-link"*/}
          {/*  // class="tab-link" TODO*/}
          {/*>*/}
          {/*  Versions*/}
          {/*</Link>*/}
          {/*<NuxtChild :p="p" />*/}
        </>
      ) : (
        <Text textAlign="center">
          <Spinner my="12" />
        </Text>
      )}
    </Flex>
  );
};

export default PackagesPage;
