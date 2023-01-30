<template>
  <CBox position="relative">
    <div class="purple-burst" />
    <CBox
      :pt="[4, 20]"
      :pb="[10, 20]"
      maxWidth="containers.lg"
      mx="auto"
      px="4"
      position="relative"
      zIndex="1"
    >
      <CHeading as="h1" size="xl" mb="2"
        >Cannon manages protocol deployments on blockchains</CHeading
      >
      <CHeading
        as="h2"
        size="lg"
        fontWeight="normal"
        mb="6"
        lineHeight="1.5"
        opacity="0.85"
        >'Infrastructure as Code' for Foundry and Hardhat
      </CHeading>
      <CBox>
        <CButton
          as="nuxt-link"
          mr="6"
          to="/get-started"
          variant-color="teal"
          mb="6"
          bg="teal.600"
        >
          Get Started</CButton
        >
        <CButton
          as="nuxt-link"
          to="/search"
          variant-color="black"
          variant="outline"
          mb="6"
          opacity="0.85"
          :_hover="{ opacity: 1 }"
        >
          Browse packages</CButton
        >
      </CBox>
    </CBox>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Hero'
}
</script>

<style scoped>
.purple-burst {
  display: block;
  pointer-events: none !important;
  position: absolute;
  width: 50vw;
  height: 50vw;
  right: 0;
  bottom: 0;
  z-index: 0;
  transform: translateY(50%);
  background: radial-gradient(
    circle at 100%,
    rgba(169, 14, 177, 0.2) 0%,
    rgba(169, 14, 177, 0) 50%
  );
}
</style>