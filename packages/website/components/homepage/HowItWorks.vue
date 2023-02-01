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
            mb="4"
            >How it works</CHeading
          >
          <CText as="p" mb="4" :pr="[0, 2]">
            <strong>Cannon</strong> is like
            <CLink
              isExternal
              href="https://www.terraform.io/"
              textDecoration="underline"
              >Terraform</CLink
            >
            for
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
            >.
          </CText>
          <CText as="p" mb="4"
            >Use <strong>Cannonfiles</strong> instead of deploy scripts for a
            declarative approach to managing protocols, including upgrades and
            configuration. Then, export deployment information into a package
            and share it on the registry.
          </CText>
          <CText as="p" :mb="[12, 0]"
            >Cannon’s <strong>packages</strong> allow for maximum composability.
            They can be imported into Cannonfiles for integrations, provisioned
            by Cannonfiles to deploy new instances, and run on their own for
            local development and testing.</CText
          >
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
            <CBox mb="3">
              <CommandPreview command="npx @usecannon/cli synthetix-sandbox" />
            </CBox>
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
import CommandPreview from "../shared/CommandPreview"

export default {
  name: 'HowItWorks',
  components: {
    CommandPreview
  }
}
</script>

<style lang="scss" scoped>
.teal-burst {
  display: block;
  pointer-events: none !important;
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
  pointer-events: none !important;
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