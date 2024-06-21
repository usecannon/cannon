import { ReactNode } from 'react';
import { Button } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function CustomLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button
      as={NextLink}
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
      href={href}
    >
      {children}
    </Button>
  );
}
