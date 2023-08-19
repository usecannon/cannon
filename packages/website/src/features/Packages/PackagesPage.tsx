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
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { Cannonfile } from '@/features/Packages/Cannonfile';
import { Versions } from '@/features/Packages/Versions';
import { Interact } from '@/features/Packages/Interact';
import { NavLink } from '@/components/NavLink';

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
            mb={8}
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <Container maxW="container.lg">
              <Heading as="h1" size="lg" mb="2">
                {pkg?.name}
              </Heading>
              <Box mb={4}>
                <PublishInfo p={pkg} />
              </Box>

              <Flex gap={8}>
                <NavLink href="./" isSmall>
                  Deployment
                </NavLink>
                <NavLink href="./cannonfile" isSmall>
                  Cannonfile
                </NavLink>
                <NavLink href="./code" isSmall>
                  Code
                </NavLink>
                <NavLink href="./interact" isSmall>
                  Interact
                </NavLink>
              </Flex>
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
