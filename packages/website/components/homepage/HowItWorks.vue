<template>
  <CBox position="relative">
    <div class="teal-burst" />
    <CBox
      py="20"
      maxWidth="containers.lg"
      mx="auto"
      px="4"
      position="relative"
      zIndex="1"
    >
      <CGrid
        template-columns="repeat(12, 1fr)"
        gap="6"
        width="100%"
        alignItems="center"
      >
        <CGridItem :col-span="[12, 6]">
          <CHeading
            as="h3"
            size="lg"
            textTransform="uppercase"
            fontWeight="normal"
            letterSpacing="1px"
            mb="5"
            >How it works</CHeading
          >
          <CText as="p" mb="5">
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
            >Configure your protocol's scripts, keepers, and on-chain
            dependencies in your <code>cannon.json</code> file for
            <strong
              >automated deployments on multiple local and live chains.</strong
            >
          </CText>
          <CText as="p" :mb="[5, 0]">
            Cannon comes with a
            <strong>built-in package manager</strong> (backed on Ethereum and
            IPFS) so you can easily include existing protocols for development
            and testing.
          </CText>
        </CGridItem>
        <CGridItem :col-span="[12, 6]">
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
            >npm install hardhat-cannon</CCode
          >

          <CText fontWeight="semibold" mb="1"
            >2. Add this to your <code>hardhat.config.js</code></CText
          >
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            mb="6"
            >require('hardhat-cannon');</CCode
          >

          <CText fontWeight="semibold" mb="1"
            >3. Start a local chain with Synthetix</CText
          >
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            mb="1"
            >npx hardhat cannon synthetix:latest</CCode
          >
          <CText fontSize="sm" mb="6">
            <small
              ><CLink as="nuxt-link" to="/search" textDecoration="underline"
                >Browse packages</CLink
              >
              for other protocols you can quickly deploy.</small
            >
          </CText>
        </CGridItem>
      </CGrid>
    </CBox>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'HowItWorks'
}
</script>

<style scoped>
.teal-burst {
  display: block;
  position: absolute;
  width: 50vw;
  height: 50vw;
  left: 0;
  bottom: 0;
  z-index: 0;
  transform: translateY(50%);
  background: radial-gradient(
    circle at 0%,
    rgba(26, 214, 255, 0.1) 0%,
    rgba(26, 214, 255, 0) 50%
  );
}
</style>