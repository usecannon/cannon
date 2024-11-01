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
import { useMediaQuery } from 'usehooks-ts';

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
        Learn
      </NavLink>
    </div>
  );
};

const SettingsButton = () => {
  const pathname = useRouter().pathname;
  const isActive = pathname.startsWith('/settings');

  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className={cn(
        'relative',
        isActive ? 'bg-teal-900 border-teal-700' : 'bg-black border-gray-500',
        'hover:bg-teal-900 hover:border-teal-500'
      )}
    >
      <Link href={links.SETTINGS}>
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            fill="none"
            stroke="white"
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          ></path>
          <circle fill="none" stroke="white" cx="12" cy="12" r="3"></circle>
        </svg>
      </Link>
    </Button>
  );
};

export const Header = () => {
  const router = useRouter();
  const isHomePage = router.pathname === '/';

  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div
      className={cn(
        'w-full z-50',
        isHomePage ? 'fixed top-0 left-0 right-0' : 'relative',
        isHomePage ? '' : 'border-b border-gray-700',
        isHomePage ? 'bg-transparent' : 'bg-black',
        'transition-colors duration-200'
      )}
    >
      <div className="flex items-center pt-4 xl:pt-0 px-3 flex-wrap">
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
          className="ml-3 uppercase tracking-wider font-miriam text-gray-400 border-gray-400"
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
            <div className="basis-full mt-4">
              <NavLinks />
            </div>
          </>
        )}

        {isMobile && (
          <>
            <div className="ml-auto">
              <NoSSRConnectWallet />
            </div>
            <div className="ml-3">
              <SettingsButton />
            </div>
            <div className="basis-full mt-4">
              <div className="flex flex-col space-y-4">
                <NoSSRSearchBar />
                <NavLinks />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
