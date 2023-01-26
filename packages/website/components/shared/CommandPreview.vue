<template>
  <CCode variant-color="black" background="black" py="1" px="3" width="100%"
    ><span v-html="command" />
    <CBox as="span" :display="['none', 'none', 'inline']">
      <div
        @click="copy"
        class="copy-button"
        v-html="$feathericons['copy'].toSvg()" /></CBox
  ></CCode>
</template>

<script lang="js">
export default {
  name: 'CommandPreview',
  props: {
    command: String
  },
  methods: {
    copy(){
      var textToCopy = this.command;

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
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
}
</style>