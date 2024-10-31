import { ReactNode } from 'react';
import {
  Button as ChakraButton,
  ButtonProps as ChakraButtonProps,
  Tooltip,
} from '@chakra-ui/react';

type Props = {
  disabledReason?: string | false;
  children?: ReactNode;
} & Omit<ChakraButtonProps, 'isDisabled'>;

export function Button({ children, disabledReason, ...rest }: Props) {
  return (
    <Tooltip label={disabledReason}>
      <ChakraButton {...rest} isDisabled={!!disabledReason}>
        {children}
      </ChakraButton>
    </Tooltip>
  );
}
