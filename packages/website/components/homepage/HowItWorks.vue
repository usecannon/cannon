<template>
  <CBox py="20" maxWidth="containers.lg" mx="auto" px="4">
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
          plug-in inspired by Docker and Terraform. Cannonfiles are composable
          and configurable deploy scripts. The CLI comes with a built-in package
          manager.</CText
        >
        <CText as="p"
          >For example, you may be working on a smart contract that depends on
          Chainlink oracles and Uniswap. With Cannon, you can ____.</CText
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
