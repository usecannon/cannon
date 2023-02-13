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
          <Banner v-if="false" />
          <Heading />
          <Nuxt />
        </CBox>
        <Footer />
      </CBox>
    </CColorModeProvider>
  </CThemeProvider>
</template>

<script>
import Heading from '../components/layout/Heading';
import Footer from '../components/layout/Footer';
import Banner from '../components/layout/Banner';

export default {
  name: 'DefaultLayout',
  components: {
    Heading,
    Footer,
    Banner,
  },
};
</script>
