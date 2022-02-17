<template>
  <CBox pt="20">
    <Hero />
    <HowItWorks />
    <UseCases />
    <About />
  </CBox>
</template>

<script lang="js">
import Hero from "../components/homepage/Hero"
import HowItWorks from "../components/homepage/HowItWorks"
import UseCases from "../components/homepage/UseCases"
import About from "../components/homepage/About"

export default {
  name: 'Homepage',
  components: {
    Hero,
    HowItWorks,
    UseCases,
    About
  }
}
</script>
