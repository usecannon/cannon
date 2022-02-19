<template>
  <CBox position="relative">
    <div class="purple-burst" />
    <CBox
      :pt="[0, 20]"
      :pb="[10, 20]"
      maxWidth="containers.lg"
      mx="auto"
      px="4"
      position="relative"
      zIndex="1"
    >
      <CHeading as="h1" size="xl" mb="2"
        >Cannon manages protocol deployment on blockchains</CHeading
      >
      <CHeading as="h2" size="md" fontWeight="normal" mb="6" lineHeight="1.5"
        >Develop and test your smart contracts with existing protocols
        configured however you like.</CHeading
      >
      <CBox>
        <CButton
          as="nuxt-link"
          to="/search"
          mr="6"
          variant-color="teal"
          bg="teal.600"
          mb="6"
          ><div
            style="
              transform: scale(0.8) translateY(-1px);
              transform-origin: center left;
            "
            v-html="$feathericons['package'].toSvg()"
          />
          Browse packages</CButton
        >
        <CButton
          as="nuxt-link"
          to="/docs"
          variant-color="teal"
          mb="6"
          bg="teal.600"
          ><div
            style="
              transform: scale(0.8) translateY(-1px);
              transform-origin: center left;
            "
            v-html="$feathericons['file-text'].toSvg()"
          />
          Read the Docs</CButton
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