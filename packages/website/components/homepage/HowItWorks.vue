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
        :gap="[0, 12]"
        alignItems="center"
      >
        <CGridItem :col-span="[12, 6]" :pr="[0, 12]">
          <CHeading
            as="h3"
            size="lg"
            textTransform="uppercase"
            fontWeight="normal"
            letterSpacing="1px"
            mb="3"
            >How it works</CHeading
          >
          <CText as="p" mb="3" :pr="[0, 2]">
            <strong>Cannon</strong> is a CLI (compatible with
            <CLink
              isExternal
              href="https://github.com/foundry-rs/foundry"
              textDecoration="underline"
              >Foundry</CLink
            >
            and
            <CLink
              isExternal
              href="https://hardhat.org/"
              textDecoration="underline"
              >Hardhat</CLink
            >) inspired by Docker and Terraform.
          </CText>
          <CText as="p" mb="3"
            >Use existing packages or define your protocol’s contracts,
            initialization scripts, and on-chain dependencies in Cannonfiles for
            <strong>automated deployments on local and live chains.</strong>
          </CText>
          <CText as="p" :mb="[12, 0]">
            Cannon comes with a
            <strong>built-in package manager</strong> (backed on Ethereum and
            IPFS) so you can easily include existing protocols for development
            and testing.
          </CText>
        </CGridItem>
        <CGridItem :col-span="[12, 5]" position="relative">
          <CBox position="relative" zIndex="1">
            <CHeading
              as="h4"
              size="sm"
              textTransform="uppercase"
              fontWeight="normal"
              letterSpacing="1px"
              mb="4"
              >Quick Start</CHeading
            >
            <CText fontWeight="semibold" mb="1"
              >Start a local chain with a deployment of Synthetix</CText
            >
            <CCode
              variant-color="black"
              background="black"
              py="1"
              px="3"
              width="100%"
              mb="2"
              ><span style="color: #61afef">npx</span> @usecannon/cli synthetix
              <CBox as="span" :display="['none', 'none', 'inline']">
                <div
                  @click="copy"
                  class="copy-button"
                  v-html="$feathericons['copy'].toSvg()" /></CBox
            ></CCode>
            <CText fontSize="sm" :mb="[6, 0]">
              <small
                ><CLink as="nuxt-link" to="/search" textDecoration="underline"
                  >Browse packages</CLink
                >
                for other protocols you can use with Cannon.</small
              >
            </CText>
          </CBox>
          <div class="light-burst" />
        </CGridItem>
      </CGrid>
    </CBox>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'HowItWorks',
  methods: {
    copy(){
      var textToCopy = "npx @usecannon/cli synthetix:3";

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

.light-burst {
  display: block;
  position: absolute;
  width: 150%;
  max-width: 100vw;
  height: 200%;
  left: 0;
  bottom: 0;
  z-index: 0;
  transform: translate(-16%, 25%);
  background: radial-gradient(
    ellipse at center,
    rgba(65, 200, 65, 0.12) 0%,
    rgba(65, 200, 65, 0) 66%
  );
}
</style>