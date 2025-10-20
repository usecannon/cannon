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
} from '@/components/ui/sidebar';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

const getStartedGuides = [
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
    text: 'Queue with GitOps',
    href: links.QUEUE_WITH_GITOPS,
  },
  {
    text: 'Create a Deployments Repository',
    href: links.DEPLOYMENTS_REPO,
  },
  {
    text: 'Publish Your Package',
    href: `${links.GETSTARTED}/publish`,
  },
];

const advancedGuides = [
  { text: 'Manipulate the Package State', href: links.ALTER },
  { text: 'Deploy a Router', href: links.ROUTER },
  { text: 'Debugging Tips', href: links.DEBUG },
  { text: 'Cannon Compared with...', href: links.COMPARISON },
  { text: 'Troubleshooting Tips', href: links.BUILD_TROUBLESHOOTING },
  {
    text: 'Migrating to Cannon from Another Build Platform',
    href: links.MIGRATE,
  },
];

export default function GuideLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="md:pt-6">
      <SidebarGroup>
        <SidebarGroupLabel>Getting Started</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {getStartedGuides.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'w-full',
                    pathname === item.href && 'bg-muted font-medium'
                  )}
                >
                  <Link href={item.href}>{item.text}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Advanced Topics</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {advancedGuides.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    'w-full',
                    pathname === item.href && 'bg-muted font-medium'
                  )}
                >
                  <Link href={item.href}>{item.text}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
