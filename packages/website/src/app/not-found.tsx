import { Flex, Text } from '@chakra-ui/react';

export default function Custom404() {
  return (
    <Flex w="100%">
      <Text
        textTransform="uppercase"
        letterSpacing="1px"
        m="auto"
        fontFamily="var(--font-miriam)"
      >
        Page Not Found
      </Text>
    </Flex>
  );
}
