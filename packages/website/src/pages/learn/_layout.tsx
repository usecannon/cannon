'use client';

import { ReactNode } from 'react';
import { links } from '@/constants/links';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface NavLinkProps {
  href: string;
  isActive?: boolean;
  children: ReactNode;
}

const NavLink = ({ href, isActive, children }: NavLinkProps) => {
  return (
    <Link
      href={href}
      className={`
        relative py-3 px-4
        font-medium
        text-gray-200 hover:text-white
        transition-colors
        ${
          isActive
            ? 'after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-teal-400 after:rounded-sm'
            : ''
        }
      `}
    >
      {children}
    </Link>
  );
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;

  return (
    <div className="flex flex-col w-full">
      <div className="bg-black border-b border-border">
        <div className="flex items-center justify-center md:gap-4 flex-nowrap overflow-x-auto whitespace-nowrap">
          <NavLink href={links.LEARN} isActive={links.LEARN === pathname}>
            Overview
          </NavLink>
          <NavLink
            href={links.GUIDES}
            isActive={pathname.startsWith(links.GUIDES)}
          >
            Guides
          </NavLink>
          <NavLink href={links.CLI} isActive={pathname.startsWith(links.CLI)}>
            CLI
          </NavLink>
          <NavLink
            href={links.CANNONFILE}
            isActive={pathname.startsWith(links.CANNONFILE)}
          >
            Cannonfiles
          </NavLink>
        </div>
      </div>
      <div className="px-4 md:px-8 flex w-full h-full">{children}</div>
    </div>
  );
}
