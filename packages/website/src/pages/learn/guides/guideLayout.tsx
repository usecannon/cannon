'use client';

import { ReactNode } from 'react';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const useCannon = [
  { text: 'Get Started', href: links.GETSTARTED },
  { text: 'Build a Protocol', href: links.BUILD },
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

          <div className="md:grid md:grid-cols-[160px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10 h-full">
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
                              pathname === item.href && 'bg-muted font-medium'
                            )}
                          >
                            <a href={item.href}>{item.text}</a>
                          </SidebarMenuButton>
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
                        <SidebarMenuButton asChild>
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
            <main className="flex w-full flex-col py-10">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
