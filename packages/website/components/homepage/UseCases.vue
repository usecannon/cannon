<template>
  <CBox py="20" maxWidth="containers.lg" mx="auto" px="4" textAlign="center">
    <CHeading
      as="h3"
      size="lg"
      textTransform="uppercase"
      fontWeight="normal"
      letterSpacing="1px"
      mb="3"
      >Use Cases</CHeading
    >

    <CSimpleGrid
      :columns="[null, 4]"
      spacing="40px"
      width="100%"
      alignItems="center"
    >
      <CBox>
        illustration/icon
        <CHeading size="sm" mb="1">Testing</CHeading>
        <CText fontSize="sm"
          >Fork tests can be slow and difficult to isolate issues/reason about.
          Define a deterministic state for your deployment.</CText
        >
      </CBox>
      <CBox>
        illustration/icon
        <CHeading size="sm" mb="1">Proof of Concepts</CHeading>
        <CText fontSize="sm">Especially multichain</CText>
      </CBox>
      <CBox>
        illustration/icon
        <CHeading size="sm" mb="1">Simulations</CHeading>
        <CText fontSize="sm">Oracles...</CText>
      </CBox>
      <CBox>
        illustration/icon
        <CHeading size="sm" mb="1">Deploy Pipelines</CHeading>
        <CText fontSize="sm">Prodcution use case</CText>
      </CBox>
    </CSimpleGrid>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'UseCases'
}
</script>
