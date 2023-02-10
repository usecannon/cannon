<template>
  <CBox
    textAlign="center"
    fontSize="sm"
    mb="2"
    py="1"
    px="4"
    letterSpacing="0.2px"
    background="black"
    color="#ffffff"
    borderBottom="1px solid hsl(220deg 100% 12%)"
  >
    <big style="display: inline-block; transform: translateY(1px)">🚨</big>
    Cannon is under active development.
    <strong
      >Use it with caution when conducting high-risk transactions and
      deployments.</strong
    >
    <big style="display: inline-block; transform: translateY(1px)">🚨</big>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Banner'
}
</script>