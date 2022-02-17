<template>
  <CBox textAlign="center" fontSize="sm" mt="20" py="2" px="4" bg="blue.975">
    <CText opacity="0.8">
      Built for ETHDenver 2022 by
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
      >. This project is not actively maintained. View on
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