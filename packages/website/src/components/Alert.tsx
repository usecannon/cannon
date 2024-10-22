import { ReactNode } from 'react';
import {
  Alert as ChakraAlert,
  AlertProps as ChakraAlertProps,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Flex,
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
      <Flex flexDirection="row" alignItems="center" width="100%">
        <AlertIcon />
        <>
          {title && <AlertTitle>{title}</AlertTitle>}
          {children && (
            <AlertDescription width="100%" wordBreak="break-word">
              {children}
            </AlertDescription>
          )}
        </>
      </Flex>
    </ChakraAlert>
  );
}
