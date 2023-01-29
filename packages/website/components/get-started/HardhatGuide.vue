<template>
  <CBox>
    <CAlert
      my="8"
      status="info"
      bg="blue.800"
      borderColor="blue.700"
      borderWidth="1px"
    >
      <CAlertIcon />
      <CBox>
        If you learn better by example, take a look at the
        <CLink
          textDecoration="underline"
          isExternal
          to="https://github.com/usecannon/cannon/tree/main/packages/sample-hardhat-project"
          >Hardhat sample project</CLink
        >
        in the Cannon Monorepo.</CBox
      >
    </CAlert>

    <CText mb="4">Full guide coming soon.</CText>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'HardhatGuide',
}
</script>