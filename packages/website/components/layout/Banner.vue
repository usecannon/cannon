<template>
  <CBox
    textAlign="center"
    fontSize="sm"
    mb="2"
    py="1"
    px="4"
    letterSpacing="0.2px"
    background="#000000"
    color="#ffffff"
    borderBottom="1px solid hsl(220deg 100% 12%)"
  >
    <big style="display: inline-block; transform: translateY(1px)">🎉</big>
    <strong>Version 1.1 is live!</strong> Provide feedback and contribute pull
    requests on
    <CLink
      isExternal
      href="https://github.com/usecannon/cannon"
      textDecoration="underline"
      >GitHub</CLink
    >.
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Banner'
}
</script>