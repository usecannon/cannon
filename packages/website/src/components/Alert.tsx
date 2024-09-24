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
  borderless?: boolean;
  title?: string;
  children?: ReactNode;
} & ChakraAlertProps;

export function Alert({
  status = 'info',
  borderless,
  title,
  children,
  ...rest
}: Props) {
  return (
    <ChakraAlert
      status={status}
      bg="gray.800"
      border={borderless ? 'none' : '1px solid'}
      px={borderless ? '0' : '4'}
      borderColor="gray.700"
      {...rest}
    >
      <AlertIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      {children && <AlertDescription>{children}</AlertDescription>}
    </ChakraAlert>
  );
}
