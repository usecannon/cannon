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
    <SidebarProvider>
      <div className="md:hidden p-4">
        <SidebarTrigger>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </SidebarTrigger>
      </div>
      <div className="flex flex-1 flex-col max-h-full max-w-full">
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar className="border-r border-border">
            <SidebarContent>
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

          <div className="flex-1 overflow-y-auto md:max-h-[calc(100vh-151px)]">
            <div className="container max-w-[80rem] ml-0 p-8">{children}</div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
