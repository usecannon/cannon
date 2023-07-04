import { Text, Heading, Link } from '@chakra-ui/react';

export const HowItWorks = () => {
  return (
    <>
      <Heading
        as="h2"
        mb={4}
        fontWeight="normal"
        size="md"
        textTransform="uppercase"
        textAlign={{ base: 'center', md: 'left' }}
      >
        How It Works
      </Heading>
      <Text mb={4}>
        <Text as="span" fontWeight="bold">
          Cannon
        </Text>
        &nbsp;is like&nbsp;
        <Link href="https://www.terraform.io/" textDecoration="underline">
          Terraform
        </Link>
        &nbsp;for&nbsp;
        <Link
          href="https://github.com/foundry-rs/foundry"
          textDecoration="underline"
        >
          Foundry
        </Link>
        &nbsp;and&nbsp;
        <Link href="https://hardhat.org/" textDecoration="underline">
          Hardhat
        </Link>
        .
      </Text>
      <Text mb={4}>
        use&nbsp;
        <Text as="span" fontWeight="bold">
          Cannonfiles
        </Text>
        &nbsp;instead of deploy scripts for a declarative approach to managing
        protocols, including upgrades and configuration. Then, export deployment
        information into a package and share it on the registry.
      </Text>
      <Text mb={4}>
        Cannon’s&nbsp;
        <Text as="span" fontWeight="bold">
          packages
        </Text>
        &nbsp;allow for maximum composability. They can be imported into
        Cannonfiles for integrations, provisioned by Cannonfiles to deploy new
        instances, and run on their own for local development and testing.
      </Text>
    </>
  );
};
