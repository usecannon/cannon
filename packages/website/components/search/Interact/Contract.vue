<template>
  <CBox
    mb="4"
    borderRadius="4px"
    p="4"
    border="1px solid rgba(255,255,255,0.2)"
    bg="blackAlpha.500"
  >
    <CFlex mb="2">
      <CHeading :id="anchor" mb="1" size="lg" display="inline-block">{{
        title
      }}</CHeading>
      <CLink :href="'#' + anchor" fontSize="lg" ml="2" color="gray.400"
        >#</CLink
      >
      <CBox ml="auto">
        <CCode bg="blackAlpha.800" color="whiteAlpha.800">{{
          address
        }}</CCode></CBox
      >
    </CFlex>
    <CCollapse :is-open="show">
      <Abi v-if="show" :abi="abi" :address="address" />
    </CCollapse>
    <CButton
      variant-color="blue"
      variant="outline"
      @click="show = !show"
      size="xs"
    >
      {{ show ? 'Hide' : 'Show' }} contract functions
    </CButton>
  </CBox>
</template>

<script lang="js">
import Abi from './Abi';

export default {
  name: 'Contract',
  data () {
    return {
      show: false
    }
  },
  components: {
    Abi
  },
  props: {
    title: {type: String },
    address: {type: String },
    abi: {type: Array },
  },
  computed: {
    anchor(){
      return this.address + '-' + this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
  }
}
</script>
