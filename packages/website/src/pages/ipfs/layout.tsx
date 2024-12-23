'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import { NavLink } from '@/components/NavLink';

export default function DeployLayout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;

  return (
    <div className="flex w-full flex-col">
      <div className="border-b border-gray-700 bg-black">
        <div className="flex flex-nowrap items-center justify-center gap-8 overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <NavLink
            isSmall
            href={links.IPFS_DOWNLOAD}
            isActive={pathname == links.IPFS_DOWNLOAD}
          >
            Download
          </NavLink>
          <NavLink
            isSmall
            href={links.IPFS_UPLOAD}
            isActive={pathname.startsWith(links.IPFS_UPLOAD)}
          >
            Upload
          </NavLink>
        </div>
      </div>
      {children}
    </div>
  );
}
