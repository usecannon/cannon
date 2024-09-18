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
  Spinner,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { ReactNode } from 'react';
import { NavLink } from '@/components/NavLink';
import { CustomSpinner } from '@/components/CustomSpinner';

import { IpfsLinks } from '@/features/Packages/IpfsLinks';
import { VersionSelect } from '@/features/Packages/VersionSelect';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';

import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder';

import PageLoading from '@/components/PageLoading';
import PackageAccordionHelper from '@/features/Packages/PackageAccordionHelper';
import { usePackageNameTagVariantUrlParams } from '@/hooks/routing/usePackageNameTagVariantUrlParams';
import { usePackageByRef } from '@/hooks/api/usePackage';

function TagVariantLayout({ children }: { children: ReactNode }) {
  const { name, tag, chainId, preset } = usePackageNameTagVariantUrlParams();
  const { query: params, pathname, asPath } = useRouter();

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const { data: deploymentInfo, isLoading: isDeploymentInfoLoading } =
    useQueryIpfsDataParsed<DeploymentInfo>(
      packagesQuery?.data?.deployUrl,
      !!packagesQuery?.data?.deployUrl
    );

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
              {/* Header */}
              <Flex
                flexDirection={['column', 'column', 'row']}
                alignItems={['left', 'left', 'center']}
                mb={5}
              >
                <Box>
                  <Heading as="h1" size="lg" mb="2">
                    {packagesQuery.data.name}
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
                            {isDeploymentInfoLoading ? (
                              <Spinner />
                            ) : (
                              <>
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
                                        new Date(
                                          deploymentInfo?.timestamp * 1000
                                        ),
                                        'PPPppp'
                                      ).toLowerCase()}`}
                                  </Text>
                                )}
                              </>
                            )}
                          </Flex>
                        </PopoverContent>
                      </Portal>
                    </Popover>
                  </Heading>
                  <PublishInfo p={packagesQuery.data} />
                </Box>
                <Box ml={[0, 0, 'auto']} mt={[6, 6, 0]}>
                  <VersionSelect pkg={packagesQuery.data} />
                </Box>
              </Flex>

              <PackageAccordionHelper
                name={name}
                tag={tag}
                chainId={chainId}
                preset={preset}
              />

              {/* Package Tabs */}
              <Flex
                gap={8}
                align="center"
                maxW="100%"
                overflowX="auto"
                overflowY="hidden"
              >
                <NavLink
                  isActive={pathname == '/packages/[name]/[tag]/[variant]'}
                  href={`/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}`}
                  isSmall
                >
                  Deployment
                </NavLink>
                <NavLink
                  isActive={pathname.startsWith(
                    '/packages/[name]/[tag]/[variant]/code'
                  )}
                  href={`/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}/code`}
                  isSmall
                >
                  Code
                </NavLink>
                {chainId != 13370 && (
                  <NavLink
                    isActive={pathname.startsWith(
                      '/packages/[name]/[tag]/[variant]/interact'
                    )}
                    href={
                      pathname.startsWith(
                        '/packages/[name]/[tag]/[variant]/interact'
                      )
                        ? asPath
                        : `/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}/interact`
                    }
                    isSmall
                  >
                    Interact
                  </NavLink>
                )}
                <NavLink
                  isActive={
                    pathname == '/packages/[name]/[tag]/[variant]/cannonfile'
                  }
                  href={`/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}/cannonfile`}
                  isSmall
                >
                  Cannonfile
                </NavLink>
                <Box ml="auto">
                  <IpfsLinks pkg={packagesQuery?.data} />
                </Box>
              </Flex>
            </Container>
          </Box>
          {children}
        </>
      ) : packagesQuery.isError ? (
        <Text
          textTransform="uppercase"
          letterSpacing="1px"
          m="auto"
          fontFamily="var(--font-miriam)"
        >
          Package Not Found
        </Text>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
}

export default function PackageNameTagVariantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  return router.isReady ? (
    <TagVariantLayout>{children}</TagVariantLayout>
  ) : (
    <PageLoading />
  );
}
