<template>
  <CBox mb="2">
    <CBox v-for="o in output" :key="JSON.stringify(o)">
      <CHeading mb="1" size="lg">{{ o.title }}</CHeading>
      <CCode bg="blackAlpha.800" color="whiteAlpha.800">{{ o.url }}</CCode>
      <ContractStep :contracts="o.contracts" />
      <ProvisionStep v-if="o.imports" :imports="o.imports" />
    </CBox>
  </CBox>
</template>

<script lang="js">
import ContractStep from './ContractStep';

export default {
  name: 'ProvisionStep',
  props: {
    imports: {
        type: Object
    }
  },
  components: {
    ContractStep
  },
  computed: {
    output(){
      return Object.entries(this.imports).map(([k,v]) => {
        return { title: k, url: v.url, contracts: v.contracts, imports: v.imports }
      })
    }
  }
}
</script>
