<template>
  <CBox
    p="6"
    bg="blue.975"
    d="block"
    as="nuxt-link"
    :to="'/_/' + id"
    mb="5"
    borderRadius="4px"
    :_hover="{ bg: 'blue.950' }"
    transition="0.12s"
  >
    <CHeading as="h4" size="md" mb="1">Title Here</CHeading>
    <CText color="gray.300" mb="3">Description goes here...</CText>
    <CBox mb="2">
      <CTag size="sm" variantColor="blue" mr="1">DEXes</CTag>
      <CTag size="sm" variantColor="blue" mr="1">Lending</CTag>
    </CBox>
    <CText color="gray.300" fontSize="xs" fontFamily="mono"
      >version 1.2.1 published by 0x123 14 days ago</CText
    >
  </CBox>
</template>


<script lang="js">
export default {
  name: 'Preview',
  props: {
      id: {
          type: String
      }
  }
}
</script>