'use client';

import { FC, ReactNode } from 'react';
import { links } from '@/constants/links';
import { useRouter } from 'next/router';
import Link from 'next/link';

const useCannon = [
  { text: 'Get Started', href: links.GETSTARTED },
  { text: 'Build a Protocol', href: links.BUILD },
  { text: 'Deploy a Router', href: links.ROUTER },
  { text: 'Debugging Tips', href: links.DEBUG },
];

interface CustomLinkProps {
  href: string;
  children: ReactNode;
}

const CustomLink: FC<CustomLinkProps> = ({ href, children }) => {
  const pathname = useRouter().pathname;
  const isActive = href === pathname;

  return (
    <Link
      href={href}
      className={`
        block py-0.5 px-2 mb-0.5
        text-sm rounded-md
        cursor-pointer
        hover:bg-gray-800
        ${href === '#' ? 'italic text-gray-400' : ''}
        ${isActive ? 'font-medium bg-gray-800' : ''}
      `}
    >
      {children}
    </Link>
  );
};

interface SectionProps {
  title: string;
  links: { href: string; text: string }[];
}

const Section: FC<SectionProps> = ({ title, links }) => (
  <div className="my-4">
    <h2 className="px-2 mb-1.5 text-sm font-medium text-gray-200 tracking-[0.1px]">
      {title}
    </h2>
    <div className="mb-6">
      {links.map((link, index) => (
        <CustomLink key={index} href={link.href}>
          {link.text}
        </CustomLink>
      ))}
    </div>
  </div>
);

export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col max-h-full max-w-full">
      <div className="flex flex-1 flex-col md:flex-row">
        <div
          className={`
          flex flex-col overflow-y-auto
          w-full md:w-[200px] md:max-w-[200px]
          border-b md:border-b-0 md:border-r
          border-gray-600 md:border-gray-700
          max-h-[140px] md:max-h-[calc(100vh-151px)]
        `}
        >
          <div className="px-3 pb-2">
            <Section title="Use Cannon" links={useCannon} />
            <Section
              title="Build DeFi"
              links={[{ href: '#', text: 'Coming Soon' }]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto md:max-h-[calc(100vh-151px)]">
          <div className="container max-w-[80rem] ml-0 p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
