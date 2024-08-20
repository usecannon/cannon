import { ReactNode } from 'react';
import {
  Alert as ChakraAlert,
  AlertProps as ChakraAlertProps,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@chakra-ui/react';

type Props = {
  status?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  children: ReactNode;
} & ChakraAlertProps;

export function Alert({ status = 'info', title, children, ...rest }: Props) {
  return (
    <ChakraAlert
      status={status}
      bg="gray.800"
      border="1px solid"
      borderColor="gray.700"
      {...rest}
    >
      <AlertIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </ChakraAlert>
  );
}
