'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { links } from '@/constants/links';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const useCannon = [
  {
    text: 'Get Started',
    href: `${links.GETSTARTED}/introduction`,
    nav: [
      {
        text: 'Set up your dev environment',
        href: `${links.GETSTARTED}/introduction`,
      },
      {
        text: 'Create a project',
        href: `${links.GETSTARTED}/creating-a-project`,
      },
      {
        text: 'Build with Cannon',
        href: `${links.GETSTARTED}/building-with-cannon`,
      },
      {
        text: 'Deploy to a blockchain',
        href: `${links.GETSTARTED}/building-to-a-network`,
      },
      {
        text: 'Publish your package',
        href: `${links.GETSTARTED}/publish`,
      },
      {
        text: 'Use the explorer',
        href: `${links.GETSTARTED}/explorer`,
      },
    ],
  },
  { text: 'Deploy a Router', href: links.ROUTER },
  { text: 'Debugging Tips', href: links.DEBUG },
];

export default function GuideLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1">
      <div className="container max-w-4xl flex-1">
        <SidebarProvider>
          {/* Mobile trigger */}
          <div className="sticky top-0 z-40 md:hidden">
            <div className="flex h-14 items-center py-4">
              <SidebarTrigger>
                <Button variant="ghost" size="sm" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open sidebar</span>
                </Button>
              </SidebarTrigger>
            </div>
          </div>

          <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 h-full">
            {/* Sidebar */}
            <Sidebar className="z-30 -ml-2 hidden w-full shrink-0 md:sticky md:block md:top-0 md:border-none">
              <SidebarContent className="py-6 lg:py-8 bg-black">
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
                                'bg-muted font-medium'
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
                                      pathname === navItem.href &&
                                        'bg-muted font-medium'
                                    )}
                                  >
                                    <Link href={navItem.href}>
                                      {navItem.text}
                                    </Link>
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
                        <SidebarMenuButton
                          asChild
                          className="pointer-events-none"
                        >
                          <span className="italic text-gray-400">
                            Coming Soon
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            {/* Main content */}
            <main className="flex w-full flex-col">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
