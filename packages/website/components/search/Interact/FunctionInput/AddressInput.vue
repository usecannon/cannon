<template>
  <CInput
    type="text"
    bg="black"
    v-model="value"
    borderColor="whiteAlpha.400"
    @input="updateValue"
  />
</template>
    
<script lang="js">
const ethers = require("ethers");

  export default {
    name: 'AddressInput',
    data(){
      return {
        value: '0x0000000000000000000000000000000000000000'
      }
    },
    mounted(){
      this.updateValue()
    },
    methods: {
      updateValue() {
        this.$emit("update:value", this.value ? this.value : '0x0000000000000000000000000000000000000000');
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    