<template>
  <CBox py="5" maxWidth="containers.lg" mx="auto" px="4">
    <CGrid
      template-columns="repeat(12, 1fr)"
      gap="6"
      py="10"
      maxWidth="containers.lg"
      mx="auto"
      spacing="40px"
      alignItems="center"
    >
      <CGridItem :col-span="[12, 9]">
        <CHeading as="h4" size="md" mb="1">Title Here</CHeading>
        <CText color="gray.300" mb="3">Description goes here...</CText>
        <CBox mb="2">
          <CTag size="sm" variantColor="blue">DEXes</CTag>
          <CTag size="sm" variantColor="blue">Lending</CTag>
        </CBox>
        <CText color="gray.300" fontSize="xs" fontFamily="mono"
          >version 1.2.1 published by 0x123 14 days ago</CText
        >
      </CGridItem>
      <CGridItem :col-span="[12, 3]">
        <CText size="sm" mb="1">Copy and paste to something</CText>
        <CCode
          variant-color="black"
          background="black"
          py="1"
          px="3"
          width="100%"
          >npx hardhat cannon</CCode
        >
      </CGridItem>
    </CGrid>

    <CTabs variant-color="teal">
      <CTabList>
        <CTab>Readme</CTab>
        <CTab>Cannonfile</CTab>
      </CTabList>
      <CTabPanels>
        <CTabPanel py="4">
          <p>readme</p>
        </CTabPanel>
        <CTabPanel py="4">
          <p>Cannonfile (Nuxt Content already imports Prism)</p>
        </CTabPanel>
      </CTabPanels>
    </CTabs>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Search'
}
</script>
