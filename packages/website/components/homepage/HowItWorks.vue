<template>
  <CBox position="relative">
    <div class="teal-burst" />
    <CBox
      py="20"
      maxWidth="containers.lg"
      mx="auto"
      px="4"
      position="relative"
      zIndex="1"
    >
      <CSimpleGrid
        :columns="[null, 2]"
        spacing="40px"
        width="100%"
        alignItems="center"
      >
        <CBox>
          <CHeading
            as="h3"
            size="lg"
            textTransform="uppercase"
            fontWeight="normal"
            letterSpacing="1px"
            mb="3"
            >How it works</CHeading
          >
          <CText as="p" mb="3">
            <strong>Cannon</strong> is a
            <CLink
              isExternal
              href="https://hardhat.org/"
              textDecoration="underline"
              >Hardhat</CLink
            >
            plug-in inspired by Docker and Terraform.
          </CText>
          <CText as="p" mb="3"
            >Configure your protocol's scripts, keepers, and on-chain
            dependencies in your <code>canon.json</code> file for
            <strong>automated deployments on local and live chains.</strong>
          </CText>
          <CText as="p" mb="3">
            Cannon comes with a <strong>built-in package manager</strong> backed
            on Ethereum and IPFS so you can easily include existing
            protocols.</CText
          >
          <CText as="p"
            >For example, if your smart contract depends on Uniswap and
            Chainlink oracles across multiple chains, Cannon automates the
            deployment of a local environment with these contracts for
            development and testing.</CText
          >
        </CBox>
        <CBox>
          <CText fontWeight="semibold" mb="1"
            >1. Install the Hardhat plug-in</CText
          >
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            mb="6"
            >npx install hardhat-canon</CCode
          >

          <CText fontWeight="semibold" mb="1"
            >2. Define a <code>canon.json</code> file</CText
          >
          <CBox mb="6">
            <prism-editor
              class="my-editor"
              v-model="code"
              :highlight="highlighter"
              v-if="false"
            ></prism-editor>
          </CBox>

          <CText fontWeight="semibold" mb="1">3. Deploy to a local node</CText>
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            >npx hardhat cannon</CCode
          >
        </CBox>
      </CSimpleGrid>
    </CBox>
  </CBox>
</template>

<script lang="js">
  // import Prism Editor
  import { PrismEditor } from 'vue-prism-editor';
  import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere

  // import highlighting library (you can use any library you want just return html string)
  import { highlight, languages } from 'prismjs/components/prism-core';
  import 'prismjs/components/prism-json';
  import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles

export default {
  name: 'HowItWorks',
    components: {
      PrismEditor,
    },
    methods: {
      highlighter(code) {
        return  highlight(code, languages.json);
      },
    },
  data() {
    return {
      code: `
{
    "name": "mySampleProject:latest",
    "chains": [
        {
            "deploy": ["mySampleProject:latest", "synthetix:2.60", "keeper:snapshot-keeper"],
            "chainId": 10
        },
        {
            "deploy": ["synthetix:2.62"],
            "chainId": 100
        }
    ]
}`
    }
  }
}
</script>

<style scoped>
.teal-burst {
  display: block;
  position: absolute;
  width: 50vw;
  height: 50vw;
  left: 0;
  bottom: 0;
  z-index: 0;
  transform: translateY(50%);
  background: radial-gradient(
    circle at 0%,
    rgba(26, 214, 255, 0.1) 0%,
    rgba(26, 214, 255, 0) 50%
  );
}
</style>