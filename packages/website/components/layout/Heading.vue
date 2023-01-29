<template>
  <CFlex
    as="nav"
    align="center"
    justify="space-between"
    wrap="wrap"
    p="4"
    color="white"
    maxWidth="containers.lg"
    mx="auto"
    alignContent="center"
    position="relative"
    zIndex="1"
  >
    <CFlex align="center">
      <CText
        as="h1"
        fontWeight="bold"
        fontFamily="'Miriam Libre'"
        size="lg"
        fontSize="26px"
        letterSpacing="2.5px"
        :mb="[4, 0]"
        ><NuxtLink to="/"
          ><CImage
            d="inline-block"
            style="transform: translate(-3.5px, -2.5px) scale(1.6)"
            :src="require('@/static/logomark.svg')"
          />CANNON</NuxtLink
        ></CText
      >
    </CFlex>

    <CBox>
      <CLink
        as="nuxt-link"
        fontFamily="'Miriam Libre'"
        textTransform="uppercase"
        letterSpacing="1px"
        d="inline-block"
        to="/search"
        mr="5"
        >Explore</CLink
      >
      <CLink
        as="nuxt-link"
        fontFamily="'Miriam Libre'"
        textTransform="uppercase"
        letterSpacing="1px"
        d="inline-block"
        to="/docs"
        mr="5"
        >Docs</CLink
      >

      <CButton
        as="nuxt-link"
        fontFamily="'Miriam Libre'"
        textTransform="uppercase"
        letterSpacing="1px"
        to="/get-started"
        variant-color="teal"
        bg="teal.600"
        transform="translateY(-3px)"
        size="sm"
        >Get Started</CButton
      >
    </CBox>
  </CFlex>
</template>

<script lang="js">
export default {
  name: 'Header',
  data() {
    return {
      isOpen: false
    }
  },
  methods: {
    handleToggle() {
      this.isOpen = !this.isOpen
    }
  }
}
</script>

<style scoped>
.nuxt-link-active[data-chakra-component='CLink'] {
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
}
a[data-chakra-component='CLink']:hover {
  text-decoration: none !important;
}
a[data-chakra-component='CLink']:focus {
  box-shadow: none !important;
}
</style>