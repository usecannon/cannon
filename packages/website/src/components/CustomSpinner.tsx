import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CustomSpinnerProps extends HTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const CustomSpinner = ({ className, ...props }: CustomSpinnerProps) => {
  return (
    <img
      src="/images/logomark.svg"
      alt="Cannon"
      className={cn(
        'h-12 w-12 object-contain animate-pulse m-auto opacity-25',
        className
      )}
      {...props}
    />
  );
};
