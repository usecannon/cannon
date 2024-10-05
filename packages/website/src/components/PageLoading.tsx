import { CustomSpinner } from '@/components/CustomSpinner';
import { Flex } from '@chakra-ui/react';

export default function PageLoading() {
  return (
    <Flex
      flexDirection="column"
      align="center"
      justify="center"
      height="100%"
      width="100%"
    >
      <CustomSpinner />
    </Flex>
  );
}
