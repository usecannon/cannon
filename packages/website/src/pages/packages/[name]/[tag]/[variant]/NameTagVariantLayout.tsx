'use client';

import { useRouter } from 'next/router';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { InfoIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { NavLink } from '@/components/NavLink';
import { CustomSpinner } from '@/components/CustomSpinner';
import { format } from 'date-fns';
import { CheckCircledIcon, MinusCircledIcon } from '@radix-ui/react-icons';

import { IpfsLinks } from '@/features/Packages/IpfsLinks';
import { VersionSelect } from '@/features/Packages/VersionSelect';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';

import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder';

import PageLoading from '@/components/PageLoading';
import { usePackageNameTagVariantUrlParams } from '@/hooks/routing/usePackageNameTagVariantUrlParams';
import { usePackageByRef } from '@/hooks/api/usePackage';
import MainContentLoading from '@/components/MainContentLoading';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';
import { SidebarGroupLabel } from '@/components/ui/sidebar';

function _NameTagVariantLayout({ children }: { children: ReactNode }) {
  const { name, tag, chainId, preset } = usePackageNameTagVariantUrlParams();
  const { query: params, pathname, asPath } = useRouter();

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const { data: deploymentInfo, isLoading: isDeploymentInfoLoading } =
    useQueryIpfsDataParsed<DeploymentInfo>(
      packagesQuery?.data?.deployUrl,
      !!packagesQuery?.data?.deployUrl
    );

  return (
    <SidebarLayout
      centered
      hasSubheader
      mainContentOverflowY={asPath.includes('/interact') ? 'visible' : 'auto'}
    >
      {packagesQuery.isSuccess ? (
        <div className="position-relative">
          <div className="bg-black pt-5 border-b border-border">
            <div className="container max-w-[1024px] mx-auto">
              {/* Package Header */}
              <div className="flex flex-col h-[136px] md:flex-row md:items-center px-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {packagesQuery.data.name}
                    <Popover>
                      <PopoverTrigger>
                        <InfoIcon className="inline-block w-5 h-5 ml-2.5 text-gray-400" />
                      </PopoverTrigger>
                      <PopoverContent className="bg-black max-w-[320px] border-border pt-2.5">
                        <div className="flex flex-col gap-2">
                          {isDeploymentInfoLoading ? (
                            <CustomSpinner />
                          ) : (
                            <>
                              <div>
                                <SidebarGroupLabel className="m-0 h-6 p-0">
                                  Description
                                </SidebarGroupLabel>
                                {deploymentInfo?.def?.description && (
                                  <p className="text-xs">
                                    {deploymentInfo.def.description}
                                  </p>
                                )}
                              </div>
                              <div>
                                <SidebarGroupLabel className="m-0 h-6 p-0">
                                  Built with
                                </SidebarGroupLabel>
                                {(deploymentInfo?.generator ||
                                  deploymentInfo?.timestamp) && (
                                  <p className="text-xs">
                                    {deploymentInfo?.generator &&
                                      `${deploymentInfo.generator} `}
                                    {deploymentInfo?.generator &&
                                      deploymentInfo?.timestamp &&
                                      `on ${format(
                                        new Date(
                                          deploymentInfo?.timestamp * 1000
                                        ),
                                        'PPPppp'
                                      ).toLowerCase()}`}
                                  </p>
                                )}
                              </div>

                              <div>
                                {deploymentInfo?.status === 'complete' && (
                                  <>
                                    <SidebarGroupLabel className="m-0 h-6 p-0">
                                      Complete Deployment
                                    </SidebarGroupLabel>
                                    <p className="text-xs">
                                      The resulting chain state matches the
                                      desired chain definition according to the
                                      package data.
                                    </p>
                                  </>
                                )}
                                {deploymentInfo?.status === 'partial' && (
                                  <>
                                    <SidebarGroupLabel className="m-0 h-6 p-0">
                                      Partial Deployment
                                    </SidebarGroupLabel>
                                    <p className="text-xs">
                                      The resulting chain state did not
                                      completely match the desired chain
                                      definition.
                                    </p>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </h1>
                  <PublishInfo p={packagesQuery.data} />
                </div>
                <div className="md:ml-auto mt-6 md:mt-0">
                  <VersionSelect pkg={packagesQuery.data} />
                </div>
              </div>

              {/* Package Nav */}
              <div className="flex gap-8 items-center max-w-[100vw] overflow-x-auto overflow-y-hidden px-6">
                <NavLink
                  isActive={pathname == '/packages/[name]/[tag]/[variant]'}
                  href={`/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}`}
                  isSmall
                >
                  Overview
                </NavLink>
                <NavLink
                  isActive={pathname.startsWith(
                    '/packages/[name]/[tag]/[variant]/deployment'
                  )}
                  href={`/packages/${packagesQuery.data.name}/${params.tag}/${params.variant}/deployment`}
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
                <div className="ml-auto">
                  <IpfsLinks pkg={packagesQuery?.data} />
                </div>
              </div>
            </div>
          </div>
          {children}
        </div>
      ) : packagesQuery.isError ? (
        <p className="uppercase tracking-wider m-auto font-['var(--font-miriam)']">
          Package Not Found
        </p>
      ) : (
        <MainContentLoading />
      )}
    </SidebarLayout>
  );
}

export default function NameTagVariantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  return router.isReady ? (
    <_NameTagVariantLayout>{children}</_NameTagVariantLayout>
  ) : (
    <PageLoading />
  );
}
