//import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { Box, Container, Heading } from '@chakra-ui/react';
import { ReactElement } from 'react';
import Layout from '../_layout';
import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

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
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Queue Transactions"
        description="Queue Transactions"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Queue Transactions',
          description: 'Queue Transactions',
        }}
      />
      <Container maxWidth="container.md" py={8}>
        <Box mb={6}>
          <Heading size="lg" mb={2}>
            Stage Transactions
          </Heading>
        </Box>
        <QueuedTxns />
      </Container>
    </>
  );
};
QueueTransactions.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default QueueTransactions;
