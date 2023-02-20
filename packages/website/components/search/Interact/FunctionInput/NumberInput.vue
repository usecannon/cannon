<template>
  <CInput
    type="number"
    bg="black"
    step="1"
    v-model="value"
    borderColor="whiteAlpha.400"
    @input="updateValue"
  />
</template>
    
<script lang="js">
const ethers = require("ethers");

  export default {
    name: 'NumberInput',
    data(){
      return {
        value: '0'
      }
    },
    mounted(){
      this.updateValue()
    },
    methods: {
      updateValue() {
        this.$emit("update:value", this.value ? this.value : '0');
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    