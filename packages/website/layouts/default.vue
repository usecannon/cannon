<template>
  <CThemeProvider>
    <CColorModeProvider>
      <CBox
        font-family="body"
        as="main"
        background="blue.900"
        minHeight="100vh"
        color="rgba(255,255,255,0.85)"
        d="flex"
        flexDirection="column"
      >
        <CReset />
        <CBox flex="1">
          <BetaBanner />
          <Heading />
          <Nuxt />
        </CBox>
        <Footer />
      </CBox>
    </CColorModeProvider>
  </CThemeProvider>
</template>

<script>
import Heading from '../components/layout/Heading'
import Footer from '../components/layout/Footer'
import BetaBanner from '../components/layout/BetaBanner'

export default {
  name: 'DefaultLayout',
  components: {
    Heading,
    Footer,
    BetaBanner,
  },
}
</script>
