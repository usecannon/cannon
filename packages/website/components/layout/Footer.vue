<template>
  <CBox textAlign="center" fontSize="sm" mt="20" py="2" px="4" bg="blue.975">
    <CText opacity="0.8">
      Winner of the ETHDenver 2022 Hackathon. Built by
      <CLink
        textDecoration="underline"
        isExternal
        href="https://github.com/dbeal-eth"
        >dbeal-eth</CLink
      >,
      <CLink
        textDecoration="underline"
        isExternal
        href="https://github.com/mjlescano"
        >mjlescano</CLink
      >, and
      <CLink
        textDecoration="underline"
        isExternal
        href="https://github.com/noahlitvin"
        >noahlitvin</CLink
      >. View on
      <CLink
        isExternal
        href="https://github.com/Synthetixio/cannon"
        textDecoration="underline"
        >GitHub</CLink
      >.
    </CText>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'About'
}
</script>