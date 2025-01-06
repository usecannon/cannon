import { FC } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

interface ISetupCustomAlertProps {
  label: string;
  href: string;
}

export const SetupCustomAlert: FC<ISetupCustomAlertProps> = ({
  label,
  href,
}) => {
  return (
    <Alert variant="info" className={cn('my-3')}>
      <InfoCircledIcon className="h-4 w-4 mr-3" />
      <AlertDescription>
        If you learn better by example, take a look at the{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {label}
        </a>
        .
      </AlertDescription>
    </Alert>
  );
};
