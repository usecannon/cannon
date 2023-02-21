<template>
  <CInput
    type="number"
    bg="black"
    step="1"
    v-model="value"
    :borderColor="isInvalid ? 'red.500' : 'whiteAlpha.400'"
    :is-invalid="isInvalid"
    @input="updateValue"
    :_focus="{
      borderColor: isInvalid ? 'red.500' : 'blue.300',
    }"
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
        if(this.value.includes('.')){
          this.$emit("update:value", ethers.utils.parseEther(this.value));
        }else{
          this.$emit("update:value", ethers.BigNumber.from(this.value ? this.value : '0'));
        }
      }
    },
    computed: {
      isInvalid() {
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
    