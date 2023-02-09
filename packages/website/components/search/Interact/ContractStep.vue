<template>
  <CBox mb="8">
    <Contract
      v-for="o in output"
      :key="JSON.stringify(o)"
      :title="o.title"
      :address="o.address"
      :abi="o.abi"
    />
  </CBox>
</template>

<script lang="js">
import Contract from './Contract';

export default {
  name: 'ContractStep',
  components: { Contract },
  props: {
    contracts: {
        type: Object
    }
  },
  computed: {
    output(){
      return Object.entries(this.contracts).map(([k,v]) => {
        return {title:k, address: v.address, abi: v.abi}
      })
    }
  }
}
</script>
