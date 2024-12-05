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

// const Centered = ({ children }: { children: ReactNode }) => (
//   <div className={`${sidebar} container max-w-4xl flex-1`}>{children}</div>
// );

// const Left = ({ children }: { children: ReactNode }) => (
//   <div className={`${sidebar} flex h-100 flex-col md:flex-row w-full`}>
//     {children}
//   </div>
// );

// const Container = ({
//   children,
//   centered,
// }: {
//   children: ReactNode;
//   centered: boolean;
// }) =>
//   centered ? (
//     <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 h-full">
//       {children}
//     </div>
//   ) : (
//     <>{children}</>
//   );

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
  contentHeight?: string;
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
  contentHeight,
  sidebarTop,
  mainContentOverflowY = 'auto',
  borderlessSidebar = false,
}: SidebarLayoutProps) {
  const headerVar = 'var(--header-height)';
  const subheaderVar = hasSubheader ? 'var(--subheader-height)' : '0px';
  const footerVar = fixedFooter ? 'var(--footer-height)' : '0px';

  // const position = centered ? 'container max-w-5xl flex-1' : '';

  const sidebarStyles = {
    top: sidebarTop ? sidebarTop : `calc(${headerVar} + ${subheaderVar})`,
    height: contentHeight
      ? contentHeight
      : `calc(100vh - ${headerVar} - ${subheaderVar} - ${footerVar})`,
  };

  return (
    <SidebarProvider
    /* className={`${position} relative flex min-h-[calc(100vh-var(--header-height)-${subheaderVar}-${footerVar})]`} */
    >
      <CloseOnLeave />
      {/* Mobile Sidebar Trigger - Fixed to left side */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-150 md:hidden bg-black border border-border border-l-0 rounded-r-lg">
        <SidebarTrigger>
          <Button
            size="icon"
            className="h-8 w-8 rounded-r-lg rounded-l-none border-l-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SidebarTrigger>
      </div>

      {sidebarContent && (
        <Sidebar
          /* className={
              centered
                ? 'z-30 -ml-2 hidden w-full shrink-0 md:sticky md:block md:top-0 md:border-none'
                : 'h-full w-[280px] md:w-[320px] border-r border-border'
            } */

          /* className={
            'sticky w-[280px] overflow-y-auto shrink-0 w-[280px] md:w-[320px] border-r border-border'
          } */
          style={sidebarStyles}
          className={`z-100 sticky w-[280px] md:w-[280px] shrink-0 overflow-y-auto ${
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
          contentHeight ? contentHeight : 'auto'
        }]`}
      >
        {/* container p-4 md:px-6 lg:px-8 ml-0 */}
        <div className="h-full w-full">{children}</div>
      </main>
    </SidebarProvider>
  );
}
