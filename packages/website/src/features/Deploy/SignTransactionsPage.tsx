'use client';

import { useStore } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { useExecutedTransactions } from '@/hooks/safe';
import {
  Box,
  Checkbox,
  Container,
  Flex,
  Heading,
  Link,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Transaction } from './Transaction';

export default function SignTransactionsPage() {
  return <SignTransactions />;
}

function SignTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const { staged, isLoading: isLoadingSafeTxs } =
    useSafeTransactions(currentSafe);
  const { data: history } = useExecutedTransactions(currentSafe);
  const [isChecked, setIsChecked] = useState(true);

  const handleCheckboxChange = (e: any) => {
    setIsChecked(e.target.checked);
  };

  return (
    <Container maxW="container.lg" py={8}>
      {/* Header */}
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

      {/* Staged txs */}
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
        {isLoadingSafeTxs ? (
          <Skeleton height="20px" />
        ) : (
          currentSafe &&
          (staged.length === 0 ? (
            <Text color="gray.300">
              There are no transactions queued on the selected safe.
            </Text>
          ) : (
            staged.map((tx) => (
              <Transaction
                key={JSON.stringify(tx.txn)}
                safe={currentSafe}
                tx={tx.txn}
                hideExternal={false}
                isStaged
              />
            ))
          ))
        )}
      </Box>

      {/* Executed txs */}
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
          <Flex mb="5">
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
              Show Cannon transactions only
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
