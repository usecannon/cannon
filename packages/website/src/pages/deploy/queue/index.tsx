//import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { Box, Container, Heading } from '@chakra-ui/react';
import { ReactElement } from 'react';
import Layout from '../_layout';
//import { Metadata } from 'next';

/*export const metadata: Metadata = {
  title: 'Cannon | Queue Transactions',
  description: 'Queue Transactions',
  openGraph: {
    title: 'Cannon | Queue Transactions',
    description: 'Queue Transactions',
  },
  };*/

const QueueTransactions = () => {
  return (
    <Container maxWidth="container.md" py={8}>
      <Box mb={6}>
        <Heading size="lg" mb={2}>
          Stage Transactions
        </Heading>
      </Box>
    </Container>
  );
};
QueueTransactions.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default QueueTransactions;
