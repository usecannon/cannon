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
      <CGrid
        template-columns="repeat(12, 1fr)"
        gap="6"
        width="100%"
        alignItems="center"
      >
        <CGridItem :col-span="[12, 6]" :pr="[0, 12]">
          <CHeading
            as="h3"
            size="lg"
            textTransform="uppercase"
            fontWeight="normal"
            letterSpacing="1px"
            mb="5"
            >How it works</CHeading
          >
          <CText :fontSize="['lg', 'xl']" as="p" mb="5">
            <strong>Cannon</strong> is a
            <CLink
              isExternal
              href="https://hardhat.org/"
              textDecoration="underline"
              >Hardhat</CLink
            >
            plug-in inspired by Docker and Terraform.
          </CText>
          <CText :fontSize="['lg', 'xl']" as="p" mb="3"
            >Configure your protocol's scripts, keepers, and on-chain
            dependencies in your <code>cannon.json</code> file for
            <strong>automated deployments on local and live chains.</strong>
          </CText>
          <CText :fontSize="['lg', 'xl']" as="p" mb="5">
            Cannon comes with a
            <strong>built-in package manager</strong> (backed on Ethereum and
            IPFS) so you can easily include existing protocols.</CText
          >
          <CText :fontSize="['lg', 'xl']" as="p" :mb="[5, 0]"
            >For example, if your smart contract depends on a Chainlink keeper
            and Synthetix across multiple chains, Cannon automates the
            deployment of a local environment with these contracts for
            development and testing.</CText
          >
        </CGridItem>
        <CGridItem :col-span="[12, 6]">
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
            >npm install hardhat-cannon</CCode
          >

          <CText fontWeight="semibold" mb="1"
            >2. Add this to your <code>hardhat.config.js</code></CText
          >
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            mb="6"
            >require('hardhat-cannon');</CCode
          >

          <CText fontWeight="semibold" mb="1"
            >3. Define a <code>cannon.json</code> file</CText
          >
          <CBox mb="6">
            <client-only :placeholder="code">
              <prism-editor
                class="my-editor"
                v-model="code"
                :highlight="highlighter"
              ></prism-editor>
            </client-only>
          </CBox>

          <CText fontWeight="semibold" mb="1">4. Provision local nodes</CText>
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            >npx hardhat cannon</CCode
          >
        </CGridItem>
      </CGrid>
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
  import 'prismjs/themes/prism-dark.css'; // import syntax highlighting styles

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
      code: `{
    "name": "mySampleProject:latest",
    "chains": [
        {
            "deploy": [
              "mySampleProject:latest",
              "synthetix:2.60",
              "keeper:snapshot-keeper"
            ],
            "chainId": 10
        },
        {
            "deploy": [
              "mySampleProject:latest",
              "synthetix:2.62"
            ],
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

/* required class */
.my-editor {
  border-radius: 4px;
  padding: 12px;

  /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
  background: #000;
  color: #ccc;

  /* you must provide font-family font-size line-height. Example: */
  font-family: Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
}

.my-editor ::v-deep span.token.operator {
  background: transparent !important;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
  outline: none;
}
</style>