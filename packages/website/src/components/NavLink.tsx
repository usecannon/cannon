import Link from 'next/link';
import { FC, ReactNode } from 'react';

interface INavLinkProps {
  href: string;
  children: ReactNode;
  isSmall?: boolean;
  isActive?: boolean;
}

export const NavLink: FC<INavLinkProps> = ({
  href,
  children,
  isSmall,
  isActive,
}) => {
  return (
    <Link
      href={href}
      className={`
        relative
        text-gray-200
        no-underline
        ${
          isSmall
            ? 'font-medium tracking-[0.1px]'
            : 'uppercase tracking-[1px] font-miriam'
        }
        ${isSmall ? 'py-3' : 'py-4'}
        hover:text-white
        transition-colors
        ${
          isActive
            ? 'after:content-[""] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:rounded-sm after:bg-teal-400'
            : ''
        }
      `}
      {...(href.startsWith('https://')
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {children}
    </Link>
  );
};
