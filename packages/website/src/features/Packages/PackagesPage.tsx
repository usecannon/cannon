'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import {
  GetPackageQuery,
  GetPackageQueryVariables,
} from '@/types/graphql/graphql';
import { useQuery } from '@apollo/client';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Spinner,
  Text,
  TabList,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import PackageNetworks from '@/features/Search/PackageNetworks';
import { CommandPreview } from '@/components/CommandPreview';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import { Cannonfile } from '@/features/Packages/Cannonfile';

export const PackagesPage: FC<{ name: string }> = ({ name }) => {
  const { data } = useQuery<GetPackageQuery, GetPackageQueryVariables>(
    GET_PACKAGE,
    {
      variables: { name },
    }
  );

  const [p, setPackage] = useState<GetPackageQuery['packages']['0'] | null>(
    null
  );

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  return (
    <Box py="2" maxWidth="containers.lg" mx="auto" px="4">
      {p ? (
        <div>
          <Grid
            template-columns="repeat(12, 1fr)"
            gap="6"
            py="8"
            maxWidth="containers.lg"
            mx="auto"
            // spacing="40px" TODO
            alignItems="center"
          >
            <GridItem
              colSpan={[12, 7]}
              py="4"
              pr={[0, 4]}
              borderRight={[null, '1px solid rgba(255,255,255,0.25)']}
            >
              <Heading as="h4" size="md" mb="1">
                {p?.name}
              </Heading>
              <Box mb="2">
                <PublishInfo p={p!} />
              </Box>
              <PackageNetworks download p={p!} />
            </GridItem>
            <GridItem colSpan={[12, 5]}>
              <Heading
                as="h4"
                size="sm"
                textTransform="uppercase"
                fontWeight="normal"
                letterSpacing="1px"
                mb="2"
              >
                Quick Start
              </Heading>
              <CommandPreview command={`npx @usecannon/cli ${p.name}`} />
            </GridItem>
          </Grid>

          <Box borderBottom="1px solid rgba(255,255,255,0.25)" pb="2">
            <Tabs>
              <TabList>
                <Tab>Cannonfile</Tab>
                <Tab>Interact</Tab>
                <Tab>Versions</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Cannonfile p={p} />
                </TabPanel>
                <TabPanel>interact</TabPanel>
                <TabPanel>versions</TabPanel>
              </TabPanels>
            </Tabs>
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
          </Box>
          {/*<NuxtChild :p="p" />*/}
        </div>
      ) : (
        <div>
          <Text textAlign="center">
            <Spinner my="12" />
          </Text>
        </div>
      )}
    </Box>
  );
};
