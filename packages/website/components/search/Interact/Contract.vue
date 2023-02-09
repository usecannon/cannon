<template>
  <CBox mb="2">
    <CHeading mb="1" size="md">{{ title }}</CHeading>
    <CCode bg="blackAlpha.800" color="whiteAlpha.800">{{ address }}</CCode>
    <Abi :abi="abi" />
  </CBox>
</template>

<script lang="js">
import Abi from './abi';

export default {
  name: 'Contract',
  components: {
    Abi
  },
  props: {
    title: {type: String },
    address: {type: String },
    abi: {type: Array },
  },
}
</script>
