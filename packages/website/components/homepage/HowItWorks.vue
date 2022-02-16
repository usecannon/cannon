<template>
  <CBox
    py="20"
    maxWidth="containers.lg"
    mx="auto"
    px="4"
    position="relative"
    zIndex="1"
  >
    <CSimpleGrid
      :columns="[null, 2]"
      spacing="40px"
      width="100%"
      alignItems="center"
    >
      <CBox>
        <CHeading
          as="h3"
          size="lg"
          textTransform="uppercase"
          fontWeight="normal"
          letterSpacing="1px"
          mb="3"
          >How it works</CHeading
        >
        <CText as="p" mb="3">
          <strong>Cannon</strong> is a
          <CLink
            isExternal
            href="https://hardhat.org/"
            textDecoration="underline"
            >Hardhat</CLink
          >
          plug-in inspired by Docker and Terraform.
        </CText>
        <CText as="p" mb="3"
          >Cannonfiles define all of the protocols that your smart contracts
          interact with. Cannon comes with a built-in package manager, so you
          can download and share Cannonfiles for existing protocols.</CText
        >
        <CText as="p"
          >For example, if your smart contract depends on Chainlink oracles and
          Uniswap across multiple chains, Cannon automates the deployment of a
          local environment with these contracts for development and
          testing.</CText
        >
      </CBox>
      <CBox>
        <CText fontWeight="semibold" mb="1"
          >1. Install the Hardhat plug-in</CText
        >
        <CCode
          variant-color="black"
          background="black"
          py="1"
          px="3"
          width="100%"
          mb="6"
          >npx something</CCode
        >

        <CText fontWeight="semibold" mb="1">2. Define a Cannonfile</CText>
        <CCode
          variant-color="black"
          background="black"
          py="1"
          px="3"
          width="100%"
          mb="6"
          >Multiline commented example Cannonfile goes here</CCode
        >

        <CText fontWeight="semibold" mb="1"
          >3. Deploy to a local node (like npx hardhat node)</CText
        >
        <CCode
          variant-color="black"
          background="black"
          py="1"
          px="3"
          width="100%"
          >npx hardhat cannon</CCode
        >
      </CBox>
    </CSimpleGrid>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'HowItWorks'
}
</script>
