import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { FC } from 'react';

interface INavLinkProps {
  href: string;
  children: React.ReactNode;
}

export const NavLink: FC<INavLinkProps> = ({ href, children }) => {
  return (
    <Link
      href={href}
      color="white"
      as={href.startsWith('https://') ? undefined : NextLink}
      textDecoration="none"
      _hover={{ textDecoration: 'none' }}
      textTransform="uppercase"
      letterSpacing="1px"
      fontFamily="var(--font-miriam)"
    >
      {children}
    </Link>
  );
};
