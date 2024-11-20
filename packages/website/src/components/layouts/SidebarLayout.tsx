'use client';

import { ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface SidebarLayoutProps {
  children: ReactNode;
  sidebarContent: ReactNode;
  centered?: boolean;
}

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="container max-w-4xl flex-1">{children}</div>
);

const Left = ({ children }: { children: ReactNode }) => (
  <div className="flex h-100 flex-col md:flex-row w-full">{children}</div>
);

const Container = ({
  children,
  centered,
}: {
  children: ReactNode;
  centered: boolean;
}) =>
  centered ? (
    <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 h-full">
      {children}
    </div>
  ) : (
    <>{children}</>
  );

const CloseOnLeave = () => {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    const handleHashChange = () => {
      setOpenMobile(false);
    };

    // Detect initial load and hash change
    handleHashChange();

    // Add listener for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup the listener on unmount
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [setOpenMobile]);

  return null;
};

export function SidebarLayout({
  children,
  sidebarContent,
  centered = true,
}: SidebarLayoutProps) {
  const Layout = centered ? Centered : Left;
  return (
    <Layout>
      <SidebarProvider>
        <CloseOnLeave />
        {/* Mobile Sidebar Trigger - Fixed to left side */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 md:hidden bg-black border border-border border-l-0 rounded-r-lg">
          <SidebarTrigger>
            <Button
              size="icon"
              className="h-8 w-8 rounded-r-lg rounded-l-none border-l-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SidebarTrigger>
        </div>

        {/* Sidebar */}
        <Container centered={centered}>
          <Sidebar
            className={
              centered
                ? 'z-30 -ml-2 hidden w-full shrink-0 md:sticky md:block md:top-0 md:border-none'
                : 'h-full w-[280px] md:w-[320px] border-r border-border'
            }
          >
            <SidebarContent
              className={centered ? 'py-6 lg:py-8 bg-black' : 'overflow-y-auto'}
            >
              {sidebarContent}
            </SidebarContent>
          </Sidebar>
        </Container>

        {/* Main content */}
        <main className={`h-100 w-full ${centered ? '' : 'overflow-y-auto'}`}>
          <div className="container max-w-100 px-4 md:px-6 lg:px-8 h-screen ml-0">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </Layout>
  );
}
