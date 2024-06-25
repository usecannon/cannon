//import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { Box, Container, Heading, Text } from '@chakra-ui/react';
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
          <Text color="gray.300">
            Queue transactions from a package on the Cannon registry.
            Transactions executed after being staged with this tool will not
            result in a package to publish.
          </Text>
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
