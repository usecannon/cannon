import { useMediaQuery } from '@chakra-ui/react';
import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}

export function useMedia() {
  const isMobile = useMediaQuery('(max-width: 767px)')[0];
  const isTablet = useMediaQuery(
    '(min-width: 768px) and (max-width: 1279px)'
  )[0];
  const isDesktop = useMediaQuery('(min-width: 1280px)')[0];

  return { isDesktop, isTablet, isMobile };
}
