'use client';

import { useStore } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { useExecutedTransactions } from '@/hooks/safe';
import { useInMemoryPagination } from '@/hooks/useInMemoryPagination';
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
import React, { useState } from 'react';
import { Transaction } from './Transaction';
import InfiniteScroll from 'react-infinite-scroll-component';

export default function SignTransactionsPage() {
  return <SignTransactions />;
}

function SignTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const { staged, isLoading: isLoadingSafeTxs } = useSafeTransactions(
    currentSafe,
    10000
  );
  const { data: history } = useExecutedTransactions(currentSafe);
  const [isChecked, setIsChecked] = useState(true);

  const {
    paginatedData: paginatedStagedTxs,
    hasMore: hasMoreStagedTxs,
    fetchMoreData: fetchMoreStagedTxs,
  } = useInMemoryPagination(staged, 5);

  const {
    paginatedData: paginatedExecutedTxs,
    hasMore: hasMoreExecutedTxs,
    fetchMoreData: fetchMoreExecutedTxs,
  } = useInMemoryPagination(history.results, 5);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          Make sure you&apos;re using the same{' '}
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
            <Box
              id="staged-transactions-container"
              maxHeight="350px"
              overflowY="auto"
            >
              <InfiniteScroll
                dataLength={paginatedStagedTxs.length}
                next={fetchMoreStagedTxs}
                hasMore={hasMoreStagedTxs}
                loader={<Skeleton height="60px" my={2} />}
                scrollableTarget="staged-transactions-container"
              >
                {paginatedStagedTxs.map((tx) => (
                  <Transaction
                    key={JSON.stringify(tx.txn)}
                    safe={currentSafe}
                    tx={tx.txn}
                    hideExternal={false}
                    isStaged
                  />
                ))}
              </InfiniteScroll>
            </Box>
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
          <Box
            id="executed-transactions-container"
            maxHeight="300"
            overflowY="scroll"
          >
            <InfiniteScroll
              dataLength={paginatedExecutedTxs.length}
              next={fetchMoreExecutedTxs}
              hasMore={hasMoreExecutedTxs}
              loader={<div>aaaa...</div>}
              scrollableTarget="executed-transactions-container"
              endMessage={
                <Text color="gray.300" textAlign="center" mt={4}>
                  No more transactions to load.
                </Text>
              }
            >
              {paginatedExecutedTxs.map((tx) => (
                <Transaction
                  key={tx.safeTxHash}
                  safe={currentSafe}
                  tx={tx}
                  hideExternal={isChecked}
                />
              ))}
            </InfiniteScroll>
          </Box>
        </Box>
      )}
    </Container>
  );
}
