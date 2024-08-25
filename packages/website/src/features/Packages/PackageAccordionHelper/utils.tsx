import { Box, Flex, Heading } from '@chakra-ui/react';
import { PropsWithChildren, FC, JSX } from 'react';

export const ItemBodyWrapper: FC<
  PropsWithChildren & { titleText: string; titleAction: JSX.Element }
> = ({ children, titleAction, titleText }) => (
  <Box
    p={5}
    bg="gray.800"
    border="1px solid"
    borderColor="gray.700"
    borderRadius="sm"
  >
    <Flex
      mb={3}
      flexDir={['column', 'column', 'row']}
      alignItems={['left', 'left', 'center']}
      justifyContent="center"
    >
      <Heading size="sm" mb={[2.5, 2.5, 0]}>
        {titleText}
      </Heading>

      <Box ml={['none', 'none', 'auto']}>{titleAction}</Box>
    </Flex>

    {children}
  </Box>
);
