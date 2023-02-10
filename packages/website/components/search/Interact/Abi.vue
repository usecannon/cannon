<template>
  <CBox mb="2">
    <CBox v-for="f of functions" :key="JSON.stringify(f)">
      <Function :f="f" :address="address" />
    </CBox>
  </CBox>
</template>
  
<script lang="js">
import Function from './Function';

export default {
  name: 'Abi',
  props: {
    abi: {
        type: Array
    },
    address: {
        type: String
    }
  },
  components: {Function},
  computed:{
    functions(){
        return this.abi.filter(a => a.type === 'function')
    }
  }
}
</script>
  