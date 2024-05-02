import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { Box, Container, Heading } from '@chakra-ui/react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Queue Transactions',
  description: 'Queue Transactions',
  openGraph: {
    title: 'Cannon | Queue Transactions',
    description: 'Queue Transactions',
  },
};

const QueueTransactions = () => {
  return (
    <Container maxWidth="container.md" py={8}>
      <Box mb={6}>
        <Heading size="lg" mb={2}>
          Queue Transactions
        </Heading>
      </Box>
      <QueuedTxns />
    </Container>
  );
};

export default QueueTransactions;
