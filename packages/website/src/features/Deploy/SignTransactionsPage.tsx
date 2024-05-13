'use client';

import { useState } from 'react';
import {
  Box,
  Checkbox,
  Container,
  Flex,
  Heading,
  Link,
  Text,
} from '@chakra-ui/react';
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
  const { data: history } = useExecutedTransactions(currentSafe as any);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e: any) => {
    setIsChecked(e.target.checked);
  };

  return (
    <Container maxW="container.md" py={8}>
      <Box mb={6}>
        <Heading size="lg" mb={2}>
          Sign & Execute Transactions
        </Heading>
        <Text color="gray.300">
          Make sure you’re using the same{' '}
          <Link href="/settings">Safe Signature Collection Service</Link> as
          other signers.
        </Text>
      </Box>

      <Box
        mb={8}
        p={6}
        bg="gray.800"
        display="block"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="gray.600"
        borderRadius="4px"
      >
        <Heading size="md" mb={3}>
          Staged Transactions
        </Heading>
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
          <Text color="gray.300">
            There are no transactions queued on the selected safe.
          </Text>
        )}
      </Box>
      {currentSafe && (history.count ?? 0) > 0 && (
        <Box
          mb={8}
          p={6}
          bg="gray.800"
          display="block"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="gray.600"
          borderRadius="4px"
        >
          <Flex mb="4">
            <Heading size="md" mb={0}>
              Executed Transactions
            </Heading>
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
