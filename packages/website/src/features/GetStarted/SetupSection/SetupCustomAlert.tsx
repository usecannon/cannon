import { FC } from 'react';
import { Alert, AlertIcon, Link } from '@chakra-ui/react';

interface ISetupCustomAlertProps {
  label: string;
  href: string;
}

export const SetupCustomAlert: FC<ISetupCustomAlertProps> = ({
  label,
  href,
}) => {
  return (
    <Alert
      status="info"
      variant="solid"
      backgroundColor="#001d51"
      border="1px solid"
      borderColor="#003182"
      my={8}
    >
      <AlertIcon color="blue.500" />
      If you learn better by example, take a look at the&nbsp;
      <Link isExternal href={href}>
        {label}
      </Link>
      .
    </Alert>
  );
};
