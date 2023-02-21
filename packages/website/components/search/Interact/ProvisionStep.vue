<template>
  <CBox mb="8">
    <CBox v-for="o in output" :key="JSON.stringify(o)">
      <CFlex mb="2">
        <CHeading v-if="o.title" mb="1" size="lg" display="inline-block">{{
          o.title
        }}</CHeading>
        <CBox ml="auto" v-if="o.url">
          <CCode bg="blackAlpha.800" color="whiteAlpha.800">{{
            o.url.replace('ipfs://', '@ipfs:')
          }}</CCode>
          <div
            @click="copy(o.url.replace('ipfs://', '@ipfs:'))"
            class="copy-button"
            v-html="$feathericons['copy'].toSvg()"
        /></CBox>
      </CFlex>
      <ContractStep :contracts="o.contracts" :cannonOutputs="cannonOutputs" />
      <ProvisionStep
        v-if="o.imports"
        :imports="o.imports"
        :cannonOutputs="cannonOutputs"
      />
    </CBox>
  </CBox>
</template>

<script lang="js">
import ContractStep from './ContractStep';

export default {
  name: 'ProvisionStep',
  props: {
    imports: {
        type: Object
    },
    cannonOutputs: {
        type: Object
    },
  },
  components: {
    ContractStep
  },
  computed: {
    output(){
      return Object.entries(this.imports).map(([k,v]) => {
        return { title: k, url: v.url, contracts: v.contracts, imports: v.imports }
      })
    }
  },
  methods: {
    copy(textToCopy){
      this.$toast({
        title: `Copied to clipboard`,
        status: 'info',
        duration: 4000
      })

    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        // navigator clipboard api method'
        return navigator.clipboard.writeText(textToCopy);
    } else {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            // here the magic happens
            document.execCommand('copy') ? res() : rej();
            textArea.remove();
        });
    }
    }
  }
}
</script>


<style lang="scss" scoped>
.copy-button {
  float: right;
  transform: scale(0.66);
  transform-origin: center left;
  opacity: 0.75;
  transition: opacity 0.2s;
  margin-left: 8px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
}
</style>