import { cn } from '@/lib/utils';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function Callout({
  title,
  children,
  icon,
  className,
  ...props
}: React.ComponentProps<typeof Alert> & { icon?: string }) {
  return (
    <Alert className={cn('bg-muted/50', className)} {...props}>
      {icon && <span className="mr-4 text-2xl">{icon}</span>}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
