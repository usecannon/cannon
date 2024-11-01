import { HTMLAttributes } from 'react';
import { cn } from "@/lib/utils";

interface CustomSpinnerProps extends HTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const CustomSpinner = ({ className, ...props }: CustomSpinnerProps) => {
  return (
    <img
      src="/images/logomark.svg"
      alt="Cannon"
      className={cn(
        "h-16 w-16 object-cover animate-pulse mx-auto",
        className
      )}
      {...props}
    />
  );
};
