import { Button } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function CustomButton({
  children,
  disabled,
  onClick,
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      colorScheme="white"
      size="sm"
      bg="teal.900"
      borderColor="teal.500"
      _hover={{ bg: 'teal.800' }}
      textTransform="uppercase"
      letterSpacing="1px"
      fontFamily="var(--font-miriam)"
      color="gray.200"
      fontWeight={500}
      mb={[4, 4, 0]}
      isDisabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
