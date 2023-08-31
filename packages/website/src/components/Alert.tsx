import { ReactNode } from 'react';
import {
  Alert as ChakraAlert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@chakra-ui/react';

interface Props {
  status?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  children: ReactNode;
}

export function Alert({ status = 'info', title, children }: Props) {
  return (
    <ChakraAlert
      status={status}
      bg="gray.800"
      border="1px solid"
      borderColor="gray.700"
    >
      <AlertIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </ChakraAlert>
  );
}
