'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { links } from '@/constants/links';
import { GearIcon } from '@radix-ui/react-icons';
import { useMedia } from '@/hooks/useMedia';

const NoSSRConnectWallet = dynamic(
  () => import('@/features/Header/ConnectWallet'),
  {
    ssr: false,
  }
);

const NoSSRSearchBar = dynamic(() => import('@/features/Header/SearchBar'), {
  ssr: false,
});

const NavLinks = () => {
  const pathname = useRouter().pathname;
  return (
    <div className="flex items-center justify-center gap-8 flex-wrap">
      <NavLink href={links.EXPLORE} isActive={pathname.startsWith('/packages')}>
        Explore
      </NavLink>
      <NavLink href={links.DEPLOY} isActive={pathname.startsWith('/deploy')}>
        Deploy
      </NavLink>
      <NavLink href={links.LEARN} isActive={pathname.startsWith('/learn')}>
        Docs
      </NavLink>
    </div>
  );
};

const SettingsButton = () => {
  return (
    <Button asChild size="icon" variant="outline" className="bg-muted/50">
      <Link href={links.SETTINGS}>
        <GearIcon />
      </Link>
    </Button>
  );
};

export const Header = () => {
  const router = useRouter();
  const { isDesktop, isTablet, isMobile } = useMedia();

  const isHomePage = router.pathname === '/';
  const mainClassName = cn(
    'z-50 top-0 min-h-[var(--header-height)] transition-colors duration-200',
    isHomePage
      ? 'fixed left-0 right-0 bg-transparent'
      : 'w-full sticky border-b border-border bg-black'
  );

  return (
    <div className={mainClassName}>
      <div className="flex items-center pt-4 xl:pt-0 px-3 flex-wrap min-h-[inherit]">
        <Link
          href={links.HOMEPAGE}
          className="text-white no-underline hover:no-underline block xl:inline"
        >
          <div className="flex gap-1 items-center">
            <Image
              src="/images/logo.svg"
              alt="Cannon"
              height={28}
              width={151}
              className="object-cover"
            />
          </div>
        </Link>

        <Badge
          variant="outline"
          className="opacity-50 ml-3 uppercase tracking-wider font-miriam hidden lg:inline-flex"
        >
          Beta
        </Badge>

        {isDesktop && (
          <>
            <div className="ml-auto">
              <NoSSRSearchBar />
            </div>
            <div className="ml-auto mr-8">
              <NavLinks />
            </div>
            <NoSSRConnectWallet />
            <div className="ml-3">
              <SettingsButton />
            </div>
          </>
        )}

        {isTablet && (
          <>
            <div className="ml-auto">
              <NoSSRSearchBar />
            </div>
            <div className="ml-3">
              <NoSSRConnectWallet />
            </div>
            <div className="ml-3">
              <SettingsButton />
            </div>
            <div className="basis-full">
              <NavLinks />
            </div>
          </>
        )}

        {isMobile && (
          <>
            <div className="ml-auto flex items-center gap-3">
              <NoSSRSearchBar />
              <NoSSRConnectWallet />
            </div>
            <div className="basis-full flex items-center justify-between">
              <NavLinks />
              <SettingsButton />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
