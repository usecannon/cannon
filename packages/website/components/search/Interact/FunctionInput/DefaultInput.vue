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
        const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
        if(this.inputType == 'bytes32' && !bytes32Regex.test(this.value)){
          this.$emit("update:value", ethers.utils.formatBytes32String(this.value));
        }else{
          this.$emit("update:value", this.value ? this.value : '');
        }
        
      }
    },
    props: {
        input: {
            type: Object
        },
        inputType: {
            type: String
        },
    }
  }
  </script>
    