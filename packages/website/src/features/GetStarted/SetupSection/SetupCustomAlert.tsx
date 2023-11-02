import { FC } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Link,
} from '@chakra-ui/react';

interface ISetupCustomAlertProps {
  label: string;
  href: string;
}

export const SetupCustomAlert: FC<ISetupCustomAlertProps> = ({
  label,
  href,
}) => {
  return (
    <Alert status="info" mt={3} mb={4} bg="gray.800">
      <AlertIcon />
      <Box>
        <AlertDescription>
          If you learn better by example, take a look at the&nbsp;
          <Link isExternal href={href}>
            {label}
          </Link>
          .
        </AlertDescription>
      </Box>
    </Alert>
  );
};
