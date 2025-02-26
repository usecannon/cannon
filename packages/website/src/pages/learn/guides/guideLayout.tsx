'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { links } from '@/constants/links';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

const useCannon = [
  {
    text: 'Get Started',
    href: `${links.GETSTARTED}/setup`,
    nav: [
      {
        text: 'Set up Dev Environment',
        href: `${links.GETSTARTED}/setup`,
      },
      {
        text: 'Create a Project',
        href: `${links.GETSTARTED}/create-a-project`,
      },
      {
        text: 'Build with Cannon',
        href: `${links.GETSTARTED}/build-with-cannon`,
      },
      {
        text: 'Test with Cannon',
        href: `${links.GETSTARTED}/test-with-cannon`,
      },
      {
        text: 'Deploy Onchain',
        href: `${links.GETSTARTED}/deploy-onchain`,
      },
      {
        text: 'Publish Your Package',
        href: `${links.GETSTARTED}/publish`,
      },
    ],
  },
  { text: 'Deploy a Router', href: links.ROUTER },
  { text: 'Debugging Tips', href: links.DEBUG },
  { text: 'Manually Modifying the State', href: links.ALTER },
];

export default function GuideLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="md:pt-6">
      <SidebarGroup>
        <SidebarGroupLabel>Use Cannon</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {useCannon.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'w-full',
                    pathname === item.href &&
                      !item.nav &&
                      'bg-muted font-medium',
                  )}
                >
                  <Link href={item.href}>{item.text}</Link>
                </SidebarMenuButton>
                {item.nav && (
                  <SidebarMenuSub className="w-full">
                    {item.nav?.map((navItem) => (
                      <SidebarMenuSubItem key={navItem.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === navItem.href}
                          className={cn(
                            'w-full',
                            pathname === navItem.href && 'bg-muted font-medium',
                          )}
                        >
                          <Link href={navItem.href}>{navItem.text}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Build DeFi</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="pointer-events-none">
                <span className="italic text-gray-400">Coming Soon</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );

  return (
    <div className="container max-w-5xl">
      <SidebarLayout
        sidebarContent={sidebarContent}
        hasSubheader
        centered
        borderlessSidebar
        fixedFooter={false}
      >
        <div className="max-w-4xl px-4">{children}</div>
      </SidebarLayout>
    </div>
  );
}
