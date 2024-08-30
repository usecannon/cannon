import { Button, type ButtonProps } from '@chakra-ui/react';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ buttonProps: ButtonProps & { href: string } }>;
export default function ButtonOutlined({ children, buttonProps }: Props) {
  return (
    <Button
      variant="outline"
      colorScheme="white"
      size="xs"
      bg="teal.900"
      borderColor="teal.500"
      _hover={{ bg: 'teal.800' }}
      textTransform="uppercase"
      letterSpacing="1px"
      pt={0.5}
      fontFamily="var(--font-miriam)"
      color="gray.200"
      fontWeight={500}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
