import { FC } from 'react';
import { Box, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { ChainBuilderContext } from '@usecannon/builder';

/*
  * Function Calls

  * Step
  * Transaction Hash {linked to etherscan}
  * Target Address {linked to etherscan}
  * From Address {linked to etherscan}
  * Value?
  * Timestamp? Block Number?
  * Link to Code ?
  * Link to Interact ?
*/

export const InvokesTable: FC<{
  invokeState: ChainBuilderContext['txns'];
}> = ({ invokeState }) => {
  return (
    <Box overflowX="auto" px={4} mb={4}>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th color="gray.300" pl={0} borderColor="gray.500">
              Step
            </Th>
            <Th color="gray.300" borderColor="gray.500">
              Transaction Hash
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily={'mono'}>
          {Object.entries(invokeState).map(([key, value]) => (
            <Tr key={key}>
              <Td pl={0} borderColor="gray.500">
                [invoke.{key?.toString()}]
              </Td>
              <Td borderColor="gray.500">{value.hash}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
