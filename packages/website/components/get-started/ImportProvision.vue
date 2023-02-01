<template>
  <CBox>
    <CHeading size="md" mb="4" mt="12"
      >🗃️ Import and Provision Packages</CHeading
    >

    <CText mb="4"
      >You can use packages in your Cannonfiles with the
      <CLink
        textDecoration="underline"
        as="nuxt-link"
        to="/docs/technical-reference#import"
        >import</CLink
      >
      and
      <CLink
        textDecoration="underline"
        as="nuxt-link"
        to="/docs/technical-reference#provision"
        >provision</CLink
      >
      actions.</CText
    >

    <CText mb="4"
      ><CCode bg="blackAlpha.800" color="whiteAlpha.800">import</CCode> packages
      to reference the addresses in their deployment data. Find which networks
      each package has deployment data for on the
      <CLink textDecoration="underline" as="nuxt-link" to="/search"
        >registry explorer</CLink
      >.
    </CText>

    <CText mb="4"
      >For example, the Synthetix Sandbox contains a
      <CLink
        textDecoration="underline"
        isExternal
        href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml"
        >Cannonfile that deploys the sample integration contract connected to
        the official deployment addresses</CLink
      >. The relevant code looks like this:
    </CText>

    <CBox mb="12">
      <prism-editor
        class="code-editor"
        v-model="exampleCannonfile1"
        :highlight="highlighterToml"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      ><CCode bg="blackAlpha.800" color="whiteAlpha.800">provision</CCode>
      packages to deploy new instances of their protocol’s contracts.
    </CText>

    <CText mb="4">
      For example, the Synthetix Sandbox contains a
      <CLink
        textDecoration="underline"
        isExternal
        href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml"
        >Cannonfile that provisions a new instance of Synthetix</CLink
      >
      and sets up a custom development environment. This is a simplified version
      of the relevant code:
    </CText>

    <CBox mb="12">
      <prism-editor
        class="code-editor"
        v-model="exampleCannonfile2"
        :highlight="highlighterToml"
      ></prism-editor
    ></CBox>
  </CBox>
</template>

<script lang="js">
// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-solidity';

export default {
  name: 'HardhatGuide',
  components: {
    PrismEditor,
  },
  methods: {
    highlighterToml(code) {
      return  highlight(code, languages.toml);
    },
  },
  created(){
    this.exampleCannonfile1 = `[import.synthetix_omnibus]
source ="synthetix-omnibus:latest"

[contract.sample_integration]
artifact = "SampleIntegration"
args = [
    "<%= imports.synthetix_omnibus.contracts.system.CoreProxy %>",
    "<%= imports.synthetix_omnibus.contracts.system.USDProxy %>"
]
depends = ["import.synthetix_omnibus"]`
    this.exampleCannonfile2 = `[provision.synthetix]
source = "synthetix:latest"
owner = "<%= settings.owner %>"

[invoke.createPool]
target = ["synthetix.CoreProxy"]
from = "<%= settings.user %>"
func = "createPool"
args = [
    "1",
    "<%= settings.owner %>"
]
depends=["provision.synthetix"]`
  }
}
</script>