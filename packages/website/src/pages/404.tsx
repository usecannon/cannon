import { Flex, Text } from '@chakra-ui/react';

export default function Custom404({
  text = 'Page not found',
}: {
  text?: string;
}) {
  return (
    <Flex w="100%">
      <Text
        textTransform="uppercase"
        letterSpacing="1px"
        m="auto"
        fontFamily="var(--font-miriam)"
      >
        {text}
      </Text>
    </Flex>
  );
}
