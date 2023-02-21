<template>
  <CBox mb="8">
    <Contract
      v-for="o in output"
      :key="JSON.stringify(o)"
      :title="o.title"
      :address="o.address"
      :abi="o.abi"
      :cannonOutputs="cannonOutputs"
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
    },
    cannonOutputs: {
        type: Object
    },
  },
  computed: {
    output(){
      return Object.entries(this.contracts).map(([k,v]) => {
        return {title:k, address: v.address, abi: v.abi}
      })
      .sort((a, b) => a.title.localeCompare(b.title));
    }
  }
}
</script>
