<template>
  <CInput
    type="number"
    bg="black"
    step="1"
    v-model="value"
    :borderColor="isInvalid ? 'red.500' : 'whiteAlpha.400'"
    :is-invalid="isInvalid"
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
        this.$emit("update:value", ethers.BigNumber.from(this.value ? this.value : '0'));
      }
    },
    computed: {
      isInvalid() {
        if(!Number.isInteger(Number(this.value))){
          return true
        }
        if(this.positiveOnly && Number(this.value) < 0){
          return true
        }
        return false
      }
    },
    props: {
      input: {
        type: Object
      },
      positiveOnly:{
        type: Boolean
      }
    }
  }
  </script>
    