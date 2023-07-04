'use client';
import { HowItWorks } from '@/features/HomePage/HowItWorks';
import { Intro } from '@/features/HomePage/Intro';
import { QuickStart } from '@/features/HomePage/QuickStart';
import { UseCases } from '@/features/HomePage/UseCases';
import { Container, SimpleGrid, Box } from '@chakra-ui/react';
import styles from './homePage.module.scss';

export default function HomePage() {
  return (
    <>
      <Intro />
      <Box className={styles.wrapper}>
        <Container maxW="container.lg">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={32} py={16} mt={16}>
            <Box>
              <HowItWorks />
            </Box>
            <Box>
              <QuickStart />
            </Box>
          </SimpleGrid>
          <UseCases />
        </Container>
      </Box>
    </>
  );
}
