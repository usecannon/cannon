'use client';

import {
  Box,
  Container,
  Flex,
  Heading,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { ReactNode } from 'react';

import { NavLink } from '@/components/NavLink';
import { CustomSpinner } from '@/components/CustomSpinner';

import { IpfsLinks } from '@/features/Packages/IpfsLinks';
import { VersionSelect } from '@/features/Packages/VersionSelect';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';

import { useQueryIpfsData } from '@/hooks/ipfs';
import { DeploymentInfo, PackageReference } from '@usecannon/builder';
import { getPackage } from '@/helpers/api';

export default function PackageLayout({ children }: { children: ReactNode }) {
  const { query: params, pathname, asPath } = useRouter();

  const [chainId, preset] = PackageReference.parseVariant(
    decodeURIComponent(params.variant as string)
  );

  const additionalParams = {
    name: decodeURIComponent(params.name as string),
    tag: decodeURIComponent(params.tag as string),
    preset,
    chainId,
  };

  const packagesQuery = useQuery({
    queryKey: [
      'package',
      `${additionalParams.name}:${additionalParams.tag}@${additionalParams.preset}/${additionalParams.chainId}`,
    ],
    queryFn: getPackage,
    enabled:
      !!additionalParams.name &&
      !!additionalParams.tag &&
      !!additionalParams.preset &&
      !!additionalParams.chainId,
  });

  const deploymentData = useQueryIpfsData(
    packagesQuery?.data?.data.deployUrl,
    !!packagesQuery?.data?.data.deployUrl
  );

  const deploymentInfo = deploymentData.data
    ? (deploymentData.data as DeploymentInfo)
    : undefined;

  return (
    <Flex flexDirection="column" width="100%">
      {packagesQuery.isSuccess ? (
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
                    {packagesQuery.data.data.name}
                    <Popover trigger="hover">
                      <PopoverTrigger>
                        <InfoOutlineIcon boxSize={4} ml={2} color="gray.400" />
                      </PopoverTrigger>
                      <Portal>
                        <PopoverContent
                          background="gray.700"
                          maxWidth="320px"
                          borderColor="gray.800"
                        >
                          <Flex direction={'column'} p={2} gap={1}>
                            {deploymentInfo?.def?.description && (
                              <Text>{deploymentInfo.def.description}</Text>
                            )}
                            {(deploymentInfo?.generator ||
                              deploymentInfo?.timestamp) && (
                              <Text
                                color="gray.300"
                                fontSize="xs"
                                letterSpacing="0.2px"
                              >
                                {deploymentInfo?.generator &&
                                  `built with ${deploymentInfo.generator} `}
                                {deploymentInfo?.generator &&
                                  deploymentInfo?.timestamp &&
                                  `on ${format(
                                    new Date(deploymentInfo?.timestamp * 1000),
                                    'PPPppp'
                                  ).toLowerCase()}`}
                              </Text>
                            )}
                          </Flex>
                        </PopoverContent>
                      </Portal>
                    </Popover>
                  </Heading>
                  <PublishInfo p={packagesQuery.data.data} />
                </Box>
                <Box ml={[0, 0, 'auto']} mt={[6, 6, 0]}>
                  <VersionSelect pkg={packagesQuery.data.data} />
                </Box>
              </Flex>
              <Flex gap={8} align="center" maxW="100%" overflowX="auto">
                <NavLink
                  isActive={pathname == '/packages/[name]/[tag]/[variant]'}
                  href={`/packages/${packagesQuery.data.data.name}/${params.tag}/${params.variant}`}
                  isSmall
                >
                  Deployment
                </NavLink>
                <NavLink
                  isActive={pathname.startsWith(
                    '/packages/[name]/[tag]/[variant]/code'
                  )}
                  href={`/packages/${packagesQuery.data.data.name}/${params.tag}/${params.variant}/code`}
                  isSmall
                >
                  Code
                </NavLink>
                <NavLink
                  isActive={pathname.startsWith(
                    '/packages/[name]/[tag]/[variant]/interact'
                  )}
                  href={
                    pathname.startsWith(
                      '/packages/[name]/[tag]/[variant]/interact'
                    )
                      ? asPath
                      : `/packages/${packagesQuery.data.data.name}/${params.tag}/${params.variant}/interact`
                  }
                  isSmall
                >
                  Interact
                </NavLink>
                <NavLink
                  isActive={
                    pathname == '/packages/[name]/[tag]/[variant]/cannonfile'
                  }
                  href={`/packages/${packagesQuery.data.data.name}/${params.tag}/${params.variant}/cannonfile`}
                  isSmall
                >
                  Cannonfile
                </NavLink>
                <Box ml="auto">
                  <IpfsLinks pkg={packagesQuery?.data?.data} />
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
