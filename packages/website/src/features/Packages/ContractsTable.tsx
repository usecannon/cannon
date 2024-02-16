import { FC } from 'react';
import { Box, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { ChainBuilderContext } from '@usecannon/builder';

/*
  * Smart Contract Deployments

  * Step
  * Address {linked to etherscan}
  * Transaction Hash {linked to etherscan}
  * Used CREATE2?
  * Deployer Address
  * Timestamp? Block Number?
  * Link to Code ?
  * Link to Interact ?
  * Show whether its highlighted
*/
export const ContractsTable: FC<{
  contractState: ChainBuilderContext['contracts'];
}> = ({ contractState }) => {
  return (
    Object.entries(contractState).length > 0 && (
      <Box overflowX="auto" px={4} mb={4}>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th color="gray.300" pl={0} borderColor="gray.500">
                Contract
              </Th>
              <Th color="gray.300" borderColor="gray.500">
                Address
              </Th>
              <Th color="gray.300" borderColor="gray.500">
                Transaction Hash
              </Th>
            </Tr>
          </Thead>
          <Tbody fontFamily={'mono'}>
            {Object.entries(contractState).map(([key, value]) => (
              <Tr key={key}>
                <Td pl={0} borderColor="gray.500">
                  {key?.toString()}
                </Td>
                <Td borderColor="gray.500">{value.address}</Td>
                <Td borderColor="gray.500">{value.deployTxnHash}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    )
  );
};
