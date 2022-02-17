<template>
  <CThemeProvider>
    <CColorModeProvider>
      <CBox
        font-family="body"
        as="main"
        background="blue.900"
        minHeight="100vh"
        color="white"
      >
        <CReset />
        <Heading />
        <Nuxt />
      </CBox>
    </CColorModeProvider>
  </CThemeProvider>
</template>

<script>
import Heading from '../components/layout/Heading'

export default {
  name: 'DefaultLayout',
  components: {
    Heading,
  },
}
</script>
