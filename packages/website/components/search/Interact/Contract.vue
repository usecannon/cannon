<template>
  <CBox
    mb="4"
    borderRadius="4px"
    p="4"
    border="1px solid rgba(255,255,255,0.2)"
    bg="blackAlpha.500"
  >
    <CFlex mb="2">
      <CHeading :id="anchor" mb="1" size="lg" display="inline-block">{{
        title
      }}</CHeading>
      <CLink
        :href="'#' + anchor"
        fontSize="lg"
        ml="2"
        color="gray.400"
        @click="adjustScroll"
        >#</CLink
      >
      <CBox ml="auto">
        <CCode display="inline" bg="blackAlpha.800" color="whiteAlpha.800">{{
          address
        }}</CCode>
        <div
          @click="copy"
          class="copy-button"
          v-html="$feathericons['copy'].toSvg()"
        />
      </CBox>
    </CFlex>
    <CCollapse :is-open="show">
      <Abi
        v-if="show"
        :abi="abi"
        :address="address"
        :cannonOutputs="cannonOutputs"
      />
    </CCollapse>
    <CButton
      variant-color="blue"
      variant="outline"
      @click="show = !show"
      size="xs"
    >
      {{ show ? 'Hide' : 'Show' }} contract functions
    </CButton>
  </CBox>
</template>

<script lang="js">
import Abi from './Abi';

export default {
  name: 'Contract',
  data () {
    return {
      show: false
    }
  },
  components: {
    Abi
  },
  props: {
    title: {type: String },
    address: {type: String },
    abi: {type: Array },
    cannonOutputs: {type: Object },
  },
  computed: {
    anchor(){
      const currentHash = window.location.hash.replace("#","").split('-')[0]
      return currentHash + '-' + this.address
    }
  },
  methods: {
    adjustScroll(){
      setTimeout(() => {
        window.scrollBy(0, -120)
      },1)
    },
    copy(){
      var textToCopy = this.address;

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