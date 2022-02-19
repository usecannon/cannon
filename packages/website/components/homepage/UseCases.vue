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
        <CText fontSize="sm"
          >Rapidly create development environments with existing protocols
          across multiple chains.</CText
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
        <CText fontSize="sm">
          Speed up your integration tests and reduce flakes by recording your
          deployments to a snapshot.
        </CText>
      </CBox>
      <CBox>
        <CImage
          size="80px"
          :src="require('@/static/usecases_3.png')"
          alt="Simulations"
          mx="auto"
          mb="6"
        />
        <CHeading size="sm" mb="2" letterSpacing="1px">Simulations</CHeading>
        <CText fontSize="sm"
          >Create scenarios to simulate different behaviors from keepers and
          oracles.
        </CText>
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
        <CText fontSize="sm"
          >When you're ready to deploy your protocol, use the same pipeline for
          production.</CText
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
