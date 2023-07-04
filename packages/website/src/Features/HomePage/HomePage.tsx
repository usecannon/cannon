'use client';
import { HowItWorks } from '@/Features/HomePage/HowItWorks';
import { Intro } from '@/Features/HomePage/Intro';
import { QuickStart } from '@/Features/HomePage/QuickStart';
import { UseCases } from '@/Features/HomePage/UseCases';
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
