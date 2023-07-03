"use client";
import { HowItWorks } from "@/Features/HomePage/HowItWorks";
import { Intro } from "@/Features/HomePage/Intro";
import { QuickStart } from "@/Features/HomePage/QuickStart";
import { UseCases } from "@/Features/HomePage/UseCases";
import { Container, SimpleGrid, Box } from "@chakra-ui/react";

export default function Home() {
  return (
    <>
      <Intro />
      <Container maxW="container.lg">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={32} py={16}>
          <Box>
            <HowItWorks />
          </Box>
          <Box>
            <QuickStart />
          </Box>
        </SimpleGrid>
        <UseCases />
      </Container>
    </>
  );
}
