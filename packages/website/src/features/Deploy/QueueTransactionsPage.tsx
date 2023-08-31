'use client';

import { Container } from '@chakra-ui/react';
import WithSafe from './WithSafe';

export function QueueTransactionsPage() {
  return (
    <WithSafe>
      <Container maxW="100%" w="container.sm">
        QueueTransactionsPage
      </Container>
    </WithSafe>
  );
}
