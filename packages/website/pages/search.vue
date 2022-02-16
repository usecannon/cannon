<template>
  <CGrid
    template-columns="repeat(12, 1fr)"
    gap="6"
    py="10"
    maxWidth="containers.lg"
    mx="auto"
    px="4"
    spacing="40px"
  >
    <CGridItem :col-span="[12, 3]">
      <CHeading
        as="h3"
        size="sm"
        textTransform="uppercase"
        fontWeight="normal"
        letterSpacing="1px"
        mb="2"
        >Search</CHeading
      >
      <CInputGroup>
        <CInputLeftElement
          ><div
            style="
              transform: scale(0.8);
              transform-origin: center left;
              opacity: 0.66;
            "
            v-html="$feathericons['search'].toSvg()"
        /></CInputLeftElement>
        <CInput
          background="transparent"
          size="sm"
          borderColor="gray.500"
          mb="6"
        />
      </CInputGroup>

      <CHeading
        as="h3"
        size="sm"
        textTransform="uppercase"
        fontWeight="normal"
        letterSpacing="1px"
        mb="2"
        >Filter</CHeading
      >
      <CCheckboxGroup>
        <CCheckbox>Lending</CCheckbox>
        <CCheckbox>DEXes</CCheckbox>
        <CCheckbox>Derivatives</CCheckbox>
        <CCheckbox>Payments</CCheckbox>
        <CCheckbox>Assets</CCheckbox>
      </CCheckboxGroup>
    </CGridItem>
    <CGridItem :col-span="[12, 9]">
      <Preview id="placeholder" />
      <Preview id="placeholder" />
    </CGridItem>
  </CGrid>
</template>

<script lang="js">
import Preview from "../components/search/Preview"

export default {
  name: 'Search',
  components: {
    Preview
  }
}
</script>
