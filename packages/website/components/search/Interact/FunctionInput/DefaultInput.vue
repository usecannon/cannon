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
    name: 'DefaultInput',
    data(){
      return {
        value: ''
      }
    },
    mounted(){
      this.updateValue()
    },
    methods: {
      updateValue() {
        this.$emit("update:value", this.value ? this.value : '');
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    