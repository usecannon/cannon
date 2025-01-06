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
import { useRouter } from 'next/router';

const CloseOnLeave = () => {
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const fullPath = router.asPath;

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
  }, [setOpenMobile, fullPath]);

  return null;
};

interface SidebarLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  centered?: boolean;
  hasSubheader?: boolean;
  fixedFooter?: boolean;
  extraContentHeight?: string;
  mainContentHeightAuto?: boolean;
  sidebarTop?: string;
  mainContentOverflowY?: 'auto' | 'visible';
  borderlessSidebar?: boolean;
}

export function SidebarLayout({
  children,
  sidebarContent,
  centered = true,
  hasSubheader = false,
  fixedFooter = true,
  extraContentHeight,
  mainContentHeightAuto = false,
  sidebarTop,
  mainContentOverflowY = 'auto',
  borderlessSidebar = false,
}: SidebarLayoutProps) {
  const headerVar = 'var(--header-height)';
  const subheaderVar = hasSubheader ? 'var(--subheader-height)' : '0px';
  const footerVar = fixedFooter ? 'var(--footer-height)' : '0px';
  const additionalHeightVar =
    extraContentHeight === 'auto' ? '0px' : extraContentHeight || '0px';
  const contentHeight = `calc(100vh - ${headerVar} - ${subheaderVar} - ${footerVar} - ${additionalHeightVar})`;

  const sidebarStyles = {
    top: sidebarTop ? sidebarTop : `calc(${headerVar} + ${subheaderVar})`,
    height: contentHeight,
  };

  return (
    <SidebarProvider>
      <CloseOnLeave />
      {/* Mobile Sidebar Trigger - Fixed to left side */}
      {sidebarContent && (
        <main className="fixed left-0 top-1/2 -translate-y-1/2 z-[49] md:hidden bg-black border border-border border-l-0 rounded-r-lg [&:has([data-state=open])]:hidden">
          <SidebarTrigger>
            <Button
              size="icon"
              className="h-8 w-8 rounded-r-lg rounded-l-none border-l-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SidebarTrigger>
        </main>
      )}

      {sidebarContent && (
        <Sidebar
          style={sidebarStyles}
          className={`z-[49] sticky w-[280px] md:w-[280px] shrink-0 overflow-y-auto ${
            borderlessSidebar ? 'border-none' : 'border-r border-border'
          }`}
        >
          <SidebarContent
            /* className={centered ? 'py-6 lg:py-8 bg-black' : 'overflow-y-auto'} */
            className={centered ? 'bg-black' : ''}
          >
            {sidebarContent}
          </SidebarContent>
        </Sidebar>
      )}

      {/* Main content */}
      <main
        className={`cannon-page-main-content overflow-y-${mainContentOverflowY} flex-1 h-[${
          mainContentHeightAuto ? 'auto' : contentHeight
        }]`}
      >
        {/* container p-4 md:px-6 lg:px-8 ml-0 */}
        <div className="h-full w-full">{children}</div>
      </main>
    </SidebarProvider>
  );
}
