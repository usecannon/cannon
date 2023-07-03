import { Container, Heading, Text, Link, SimpleGrid } from '@chakra-ui/react';
import { UseCaseCard } from './UseCaseCard';

export const UseCases = () => {
  const useCases = [
    {
      image: '/images/lamp.png',
      title: 'Proof of Concepts',
      desc: 'Rapidly create dev environments with existing protocols configured however you like.',
    },
    {
      image: '/images/dashboard.png',
      title: 'Front-end Development',
      desc: 'Build interfaces that interact with protocols. Addresses and ABIs are automatically exported.',
    },
    // {
    //   image: "/images/spring.png",
    //   title: "Testing",
    //   desc: (
    //     <Text>
    //       Instantly spin up nodes for integration/e2e tests. Cannon pairs well
    //       with&nbsp;
    //       <Link
    //         href="https://github.com/Synthetixio/synpress"
    //         textDecoration="underline"
    //       >
    //         Synpress
    //       </Link>
    //       .
    //     </Text>
    //   ),
    // },
    {
      image: '/images/rocket.png',
      title: 'Deployment',
      desc: 'Use the same workflow for local and live deployments on any EVM-compatible blockchain.',
    },
  ];
  return (
    <Container maxW="container.lg" py={16}>
      <Heading
        as="h2"
        mb={4}
        fontWeight="normal"
        size="md"
        textTransform="uppercase"
        textAlign="center"
      >
        USE CASES
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} py={16}>
        {useCases.map((useCase, index) => (
          <UseCaseCard {...useCase} key={index} />
        ))}
      </SimpleGrid>
    </Container>
  );
};
