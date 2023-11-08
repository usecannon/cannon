'use client';

import { useState } from 'react';
import {
  Box,
  Checkbox,
  Container,
  Flex,
  FormLabel,
  Heading,
  Text,
} from '@chakra-ui/react';
import { Alert } from '@/components/Alert';
import { useSafeTransactions } from '@/hooks/backend';
import { useExecutedTransactions } from '@/hooks/safe';
import { useStore } from '@/helpers/store';
import { Transaction } from './Transaction';

export default function SignTransactionsPage() {
  return <SignTransactions />;
}

function SignTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const { staged } = useSafeTransactions(currentSafe as any);
  const history = useExecutedTransactions(currentSafe as any);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e: any) => {
    setIsChecked(e.target.checked);
  };

  return (
    <Container maxW="container.md" py={8}>
      <Box mb={6}>
        <Heading size="md" mb={2}>
          Sign & Execute Transactions
        </Heading>
        <Text fontSize="sm" color="gray.300">
          Collect signatures and execute transactions with{' '}
          {currentSafe?.address}
        </Text>
      </Box>

      <Box mb="10">
        <FormLabel mb="3">Queued Transactions</FormLabel>
        {currentSafe &&
          staged.map((tx) => (
            <Transaction
              key={JSON.stringify(tx.txn)}
              safe={currentSafe}
              tx={tx.txn}
              hideExternal={false}
            />
          ))}
        {currentSafe && staged.length === 0 && (
          <Alert status="info">
            There are no transactions queued on the selected safe
          </Alert>
        )}
      </Box>
      {currentSafe && (history.count ?? 0) > 0 && (
        <Box mb="6">
          <Flex mb="3">
            <FormLabel mb={0}>Executed Transactions</FormLabel>
            <Checkbox
              size="sm"
              borderColor="gray.200"
              color="gray.200"
              ml="auto"
              isChecked={isChecked}
              onChange={handleCheckboxChange}
            >
              Hide {'Safe{Wallet}'} Transactions
            </Checkbox>
          </Flex>
          {history.results.map((tx: any) => (
            <Transaction
              key={tx.safeTxHash}
              safe={currentSafe}
              tx={tx}
              hideExternal={isChecked}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
