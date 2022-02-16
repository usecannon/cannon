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
  >
    <CFlex align="center" mr="5">
      <CHeading as="h1" size="lg" letterSpacing="2px"
        ><NuxtLink to="/"
          ><CImage
            d="inline-block"
            style="transform: translate(-3.5px, -2.5px) scale(1.6)"
            :src="require('@/static/logomark.svg')"
          />CANNON</NuxtLink
        ></CHeading
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
        >Documentation</CLink
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