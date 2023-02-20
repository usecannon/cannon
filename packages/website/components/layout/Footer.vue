<template>
  <CBox
    textAlign="center"
    fontSize="sm"
    mt="20"
    py="2"
    px="4"
    bg="blackAlpha.700"
  >
    <CText opacity="0.8">
      <div style="transform: scale(0.75); height: 15px; display: inline-block">
        <div v-html="$feathericons['github'].toSvg()" />
      </div>
      <CLink
        isExternal
        href="https://github.com/usecannon/cannon"
        textDecoration="underline"
      >
        View the Cannon Monorepo</CLink
      >
    </CText>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Footer'
}
</script>