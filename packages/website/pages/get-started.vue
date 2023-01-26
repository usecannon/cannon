<template>
  <CBox maxWidth="containers.sm" mx="auto" px="4" my="8">
    <CHeading mb="4">Get Started with Cannon</CHeading>

    <CHeading size="lg">Run a Package</CHeading>

    install it globally with:

    <CommandPreview command="npm install -g @usecannon/cli" />

    now you can...
    <CommandPreview command="cannon synthetix:3" />

    <CHeading size="lg" mb="2">Build with Cannon</CHeading>
    (and more) run the setup command:
    <CommandPreview command="cannon setup" />

    <CText>Explain the IPFS situation.</CText>

    <CBox mb="3">
      <CButton
        :variant-color="showHardhat ? 'gray' : 'teal'"
        :bg="showHardhat ? 'gray.600' : 'teal.600'"
        size="xs"
        mr="2"
        @click="
          () => {
            showHardhat = false;
          }
        "
      >
        Foundry</CButton
      >

      <CButton
        :variant-color="!showHardhat ? 'gray' : 'teal'"
        :bg="!showHardhat ? 'gray.600' : 'teal.600'"
        size="xs"
        mr="2"
        @click="
          () => {
            showHardhat = true;
          }
        "
        >Hardhat</CButton
      >
    </CBox>
    <CBox v-if="showHardhat" class="prose">
      <nuxt-content :document="hardhatPage" />
    </CBox>
    <CBox v-else class="prose">
      <nuxt-content :document="foundryPage" />
    </CBox>
  </CBox>
</template>

<script lang="js">
import CommandPreview from "../components/shared/CommandPreview"

export default {
  name: 'Get Started',
  components: {
    CommandPreview
  },
  data() {
    return { showHardhat: false }
  },
  async asyncData({ $content, params, error }) {
    const hardhatPage = await $content('guide-hardhat')
      .fetch()
      .catch(err => {
        error({ statusCode: 404, message: "Page not found" });
      });
    const foundryPage = await $content('guide-foundry')
      .fetch()
      .catch(err => {
        error({ statusCode: 404, message: "Page not found" });
      });
      
    return {
        hardhatPage,
        foundryPage
    };
  },
}
</script>
