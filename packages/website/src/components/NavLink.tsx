import { Link } from '@chakra-ui/react';
import NextLink from 'next/link';
import { FC, ReactNode } from 'react';

interface INavLinkProps {
  href: string;
  children: ReactNode;
  isSmall?: boolean;
}

export const NavLink: FC<INavLinkProps> = ({ href, children, isSmall }) => {
  const isActive = false; // TODO: Wire it up

  return (
    <Link
      href={href}
      color="gray.200"
      as={href.startsWith('https://') ? undefined : NextLink}
      textDecoration="none"
      textTransform={isSmall ? undefined : 'uppercase'}
      fontWeight={isSmall ? 500 : undefined}
      letterSpacing={isSmall ? '0.1px' : '1px'}
      fontFamily={isSmall ? undefined : 'var(--font-miriam)'}
      textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
      _hover={{
        textDecoration: 'none',
        color: 'white',
        textShadow: '0px 0px 4px rgba(255, 255, 255, 0.44)',
      }}
      transition="all 0.12s"
      py={isSmall ? 3 : 4}
      position="relative"
      _after={
        isActive
          ? {
              content: '""',
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              height: '2px',
              borderRadius: '2px',
              backgroundColor: 'teal.400',
            }
          : {}
      }
    >
      {children}
    </Link>
  );
};
