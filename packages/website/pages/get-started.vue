<template>
  <CBox maxWidth="containers.sm" mx="auto" px="4" my="8">
    <CHeading mb="8">Get Started with Cannon</CHeading>

    <CHeading mb="4" size="lg">📦 Run a Package</CHeading>

    <CText mb="4">Start by installing Cannon with the following command:</CText>

    <CBox mb="4">
      <CommandPreview command="npm install -g @usecannon/cli" />
    </CBox>

    <CText mb="4"
      >Now you can run any package available on
      <CLink as="nuxt-link" to="/search" textDecoration="underline"
        >the registry</CLink
      >, like so:</CText
    >

    <CBox mb="4">
      <CommandPreview command="cannon synthetix:3" />
    </CBox>

    <CText mb="4"
      >This will start an
      <CLink
        href="https://github.com/foundry-rs/foundry/tree/master/anvil"
        textDecoration="underline"
        isExternal
        >Anvil node</CLink
      >
      on port 8545 with a deployment of Synthetix V3 for local testing and
      development. Press <kbd>i</kbd> to interact with the contracts directly in
      the command-line interface.</CText
    >

    <CText mb="4"
      >Find more information about the <code>synthetix:3</code> package,
      including which networks it has been deployed on, using the inspect
      command:</CText
    >

    <CBox mb="4">
      <CommandPreview command="cannon inspect synthetix:3" />
    </CBox>

    <CText mb="3"
      >You can also use the inspect command to retrieve deployment data. For
      example:</CText
    >

    <CBox mb="4">
      <CommandPreview
        command="cannon inspect synthetix:3 --chain-id 5 --write-deployments ./deployments/goerli"
      />
    </CBox>

    <CText mb="12"
      >The command-line tool has a lot of additional functionality, including
      the ability to run packages on local forks and interact with deployments
      on remote networks. See the
      <CLink
        as="nuxt-link"
        to="/docs/technical-reference#cannon-commands"
        textDecoration="underline"
        >Technical Reference</CLink
      >
      for more information.
    </CText>

    <CHeading size="lg" mb="4">🏗️ Build with Cannon</CHeading>

    <CText mb="4"
      >Run the setup command to prepare your development environment:</CText
    >
    <CBox mb="4">
      <CommandPreview command="cannon setup" />
    </CBox>

    <CText mb="6"
      >Cannon relies on IPFS for file storage. You can
      <CLink
        href="https://docs.ipfs.tech/install/ipfs-desktop/"
        textDecoration="underline"
        isExternal
        >run an IPFS node</CLink
      >
      locally or rely on a remote pinning service (such as
      <CLink
        href="https://www.infura.io/product/ipfs"
        textDecoration="underline"
        isExternal
        >Infura</CLink
      >). We recommend the former for local development and the latter when
      publishing packages. The setup command will walk you through this
      step-by-step.</CText
    >

    <CBox my="4">
      <CButton
        :variant-color="showHardhat ? 'gray' : 'teal'"
        :bg="showHardhat ? 'gray.600' : 'teal.600'"
        :_hover="{ bg: showHardhat ? 'gray.700' : 'teal.500' }"
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
        :_hover="{ bg: !showHardhat ? 'gray.700' : 'teal.500' }"
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
    <CBox v-if="showHardhat">
      <HardhatGuide />
    </CBox>
    <CBox v-else>
      <FoundryGuide />
    </CBox>
  </CBox>
</template>

<script lang="js">
import CommandPreview from "../components/shared/CommandPreview"
import FoundryGuide from "../components/get-started/FoundryGuide"
import HardhatGuide from "../components/get-started/HardhatGuide"

export default {
  name: 'Get Started',
  components: {
    CommandPreview,
    FoundryGuide,
    HardhatGuide,
  },
  data() {
    return { showHardhat: false }
  }
}
</script>
