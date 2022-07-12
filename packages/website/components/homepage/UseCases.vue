<template>
  <CBox
    :py="[10, 20]"
    maxWidth="containers.lg"
    mx="auto"
    px="4"
    textAlign="center"
    position="relative"
    zIndex="1"
  >
    <CHeading
      as="h3"
      size="lg"
      textTransform="uppercase"
      fontWeight="normal"
      letterSpacing="1px"
      mb="12"
      >Use Cases</CHeading
    >

    <CSimpleGrid :columns="[null, 2, 4]" spacing="40px" width="100%">
      <CBox>
        <CImage
          size="80px"
          :src="require('@/static/usecases_2.png')"
          alt="Proof of Concept"
          mx="auto"
          mb="6"
        />
        <CHeading size="sm" mb="2" letterSpacing="1px"
          >Proof of Concepts</CHeading
        >
        <CText fontSize="sm" mb="2"
          >Rapidly create dev environments with existing protocols configured
          however you like.</CText
        >
        <CLink
          fontSize="xs"
          fontWeight="600"
          letterSpacing="0.3px"
          opacity="0.9"
          as="nuxt-link"
          to="/docs#build-a-protocol"
          :_hover="{ textDecoration: 'none', opacity: 1 }"
          ><CText as="span" borderBottom="rgba(255,255,255,0.66) 1px dotted "
            >Learn more</CText
          >
          ›</CLink
        >
      </CBox>
      <CBox>
        <CImage
          size="80px"
          :src="require('@/static/usecases_3.png')"
          alt="Front-end Development"
          mx="auto"
          mb="6"
        />
        <CHeading size="sm" mb="2" letterSpacing="1px"
          >Front-end Development</CHeading
        >
        <CText fontSize="sm" mb="2"
          >Build interfaces that interact with protocols. Addresses and ABIs are
          automatically exported.
        </CText>
        <CLink
          fontSize="xs"
          fontWeight="600"
          letterSpacing="0.3px"
          opacity="0.9"
          as="nuxt-link"
          to="/docs#build-a-dapp"
          :_hover="{ textDecoration: 'none', opacity: 1 }"
          ><CText as="span" borderBottom="rgba(255,255,255,0.66) 1px dotted "
            >Learn more</CText
          >
          ›</CLink
        >
      </CBox>
      <CBox>
        <CImage
          size="80px"
          :src="require('@/static/usecases_1.png')"
          alt="Testing"
          mx="auto"
          mb="6"
        />
        <CHeading size="sm" mb="2" letterSpacing="1px">Testing</CHeading>
        <CText fontSize="sm" mb="2">
          Instantly spin up nodes for integration/e2e tests. Cannon pairs well
          with
          <u
            ><a href="https://github.com/Synthetixio/synpress" target="_blank"
              >Synpress</a
            ></u
          >.
        </CText>
        <CLink
          fontSize="xs"
          fontWeight="600"
          letterSpacing="0.3px"
          opacity="0.9"
          as="nuxt-link"
          to="/docs#build-an-e2e-test"
          :_hover="{ textDecoration: 'none', opacity: 1 }"
          ><CText as="span" borderBottom="rgba(255,255,255,0.66) 1px dotted "
            >Learn more</CText
          >
          ›</CLink
        >
      </CBox>
      <CBox>
        <CImage
          size="80px"
          :src="require('@/static/usecases_4.png')"
          alt="Deployment"
          mx="auto"
          mb="6"
        />
        <CHeading size="sm" mb="2" letterSpacing="1px">Deployment</CHeading>
        <CText fontSize="sm" mb="2"
          >Include the name of a chain with the <code>--network</code> option to
          deploy your protocol to a live network.</CText
        >
        <CLink
          fontSize="xs"
          fontWeight="600"
          letterSpacing="0.3px"
          opacity="0.9"
          as="nuxt-link"
          to="/docs#deploy-a-protocol"
          :_hover="{ textDecoration: 'none', opacity: 1 }"
          ><CText as="span" borderBottom="rgba(255,255,255,0.66) 1px dotted "
            >Learn more</CText
          >
          ›</CLink
        >
      </CBox>
    </CSimpleGrid>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'UseCases'
}
</script>
