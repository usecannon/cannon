<template>
  <CBox>
    <CAlert
      my="8"
      status="info"
      bg="blue.800"
      borderColor="blue.700"
      borderWidth="1px"
    >
      <CAlertIcon /><CBox>
        If you learn better by example, take a look at the
        <CLink
          textDecoration="underline"
          isExternal
          href="https://github.com/usecannon/cannon/tree/main/packages/sample-foundry-project"
          >Foundry sample project</CLink
        >
        in the Cannon Monorepo.</CBox
      >
    </CAlert>

    <CHeading size="md" mb="4" mt="12">👩‍💻 Create a Cannonfile</CHeading>
    <CText mb="4"
      >Create a new Foundry project with <kbd>forge init sample-project</kbd>.
      This will generate the following contract:</CText
    >

    <CBox mb="8">
      <prism-editor
        class="code-editor"
        v-model="exampleContract"
        :highlight="highlighterSolidity"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      >Create a <kbd>cannonfile.toml</kbd> in the root directory of the project
      with the following contents. If you plan to publish this package, you
      should at least customize the name. This will deploy the contract and set
      the number to 420:</CText
    >

    <CBox mb="8">
      <prism-editor
        class="code-editor"
        v-model="exampleCannonfile"
        :highlight="highlighterToml"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      >Now <kbd>build</kbd> the cannonfile for local development and
      testing:</CText
    >

    <CBox mb="8">
      <CommandPreview command="cannon build" />
    </CBox>

    <CText mb="4">
      This created a local deployment of your nascent protocol. You can now run
      this package locally using the command-line tool:</CText
    >
    <CBox mb="8">
      <CommandPreview command="cannon sample-foundry-project" />
    </CBox>

    <CHeading size="md" mb="4" mt="12">🚀 Deploy your Protocol</CHeading>
    <CText mb="4">Deploying is just building on a remote network!</CText>
    <CBox mb="8">
      <CommandPreview
        command="cannon build --network REPLACE_WITH_RPC_ENDPOINT --private-key REPLACE_WITH_KEY_THAT_HAS_GAS_TOKENS"
      />
    </CBox>

    <CText mb="4"
      >Verify your project’s contracts on
      <CLink
        isExternal
        href="https://www.etherscan.io"
        textDecoration="underline"
        >Etherscan:</CLink
      ></CText
    >
    <CBox mb="8">
      <CommandPreview
        command="cannon verify sample-foundry-project --api-key REPLACE_WITH_ETHERSCAN_API_KEY --chain-id REPLACE_WITH_CHAIN_ID"
      />
    </CBox>

    <CText mb="4"
      >Finally, publish your package on the
      <CLink as="nuxt-link" to="/search" textDecoration="underline"
        >Cannon registry</CLink
      >:</CText
    >
    <CBox mb="8">
      <CommandPreview
        command="cannon publish sample-foundry-project --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET"
      />
    </CBox>

    <CText mb="4"
      ><strong>Great work!</strong> Check out the
      <CLink
        as="nuxt-link"
        to="/docs/technical-reference"
        textDecoration="underline"
        >technical reference</CLink
      >
      for more information about the command-line tool and the actions you can
      define in a Cannonfile.</CText
    >
  </CBox>
</template>

<script lang="js">
import CommandPreview from "../shared/CommandPreview"
// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-solidity';

export default {
  name: 'FoundryGuide',
  components: {
    CommandPreview,
    PrismEditor,
  },
  methods: {
    highlighterToml(code) {
      return  highlight(code, languages.toml);
    },
    highlighterSolidity(code) {
      return  highlight(code, languages.solidity);
    },
  },
  created(){
    this.exampleContract = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }
}`
    this.exampleCannonfile = `name = "sample-foundry-project"
version = "0.1"
description = "Sample Foundry Project"

[setting.number]
defaultValue = "420"
description="Initialization value for the number"

[contract.counter]
artifact = "Counter"

[invoke.set_number]
target = ["counter"]
func = "setNumber"
args = ["<%= settings.number %>"]
depends = ["contract.counter"]`
  }
}
</script>