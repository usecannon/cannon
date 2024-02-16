import { FC } from 'react';
import { Box, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';

type NestedObject = { [key: string]: any };

export const EventsTable: FC<{
  extrasState: NestedObject;
}> = ({ extrasState }) => {
  return (
    <Box overflowX="auto" px={4} mb={4}>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th color="gray.300" pl={0} borderColor="gray.500">
              Name
            </Th>
            <Th color="gray.300" borderColor="gray.500">
              Value
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily={'mono'}>
          {Object.entries(extrasState).map(([key, value]) => (
            <Tr key={key}>
              <Td pl={0} borderColor="gray.500">
                {key?.toString()}
              </Td>
              <Td borderColor="gray.500">{value.toString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
