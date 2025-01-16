'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';
import { SafeAddressInput } from '@/features/Deploy/SafeAddressInput';
import ClientOnly from '@/components/ClientOnly';
import { useParams } from 'next/navigation';
import PageLoading from '@/components/PageLoading';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';
import { useMediaQuery } from 'usehooks-ts';

const NoSSRWithSafe = dynamic(() => import('@/features/Deploy/WithSafe'), {
  ssr: false,
});

export default function DeployLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = useRouter().pathname;
  const isLarge = useMediaQuery('(min-width: 1024px)');

  if (params == null) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="sticky top-[var(--header-height)] bg-black border-b border-border pl-2 z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center flex-nowrap justify-between whitespace-nowrap">
          <div className="w-full lg:max-w-[640px] pt-4 lg:pt-0 truncate">
            <ClientOnly>
              <SafeAddressInput />
            </ClientOnly>
          </div>
          <div className="flex gap-6 items-center justify-start lg:justify-end grow lg:px-4 w-full overflow-x-auto overflow-y-hidden">
            <NavLink
              isSmall
              href={links.DEPLOY}
              isActive={
                links.DEPLOY == pathname ||
                pathname.startsWith(links.DEPLOY + '/txn')
              }
            >
              Sign{isLarge && ' Transactions'}
            </NavLink>
            <NavLink
              isSmall
              href={links.QUEUEFROMGITOPS}
              isActive={pathname.startsWith(links.QUEUEFROMGITOPS)}
            >
              Queue Deployment
            </NavLink>
            <NavLink
              isSmall
              href={links.QUEUETXS}
              isActive={pathname.startsWith(links.QUEUETXS)}
            >
              Stage{isLarge && ' Transactions'}
            </NavLink>
          </div>
        </div>
      </div>

      {/* Body */}
      <SidebarLayout hasSubheader centered>
        <NoSSRWithSafe>{children}</NoSSRWithSafe>
      </SidebarLayout>
    </div>
  );
}
