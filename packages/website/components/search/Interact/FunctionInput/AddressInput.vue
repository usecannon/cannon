<template>
  <CInput
    type="text"
    bg="black"
    v-model="value"
    :borderColor="isInvalid ? 'red.500' : 'whiteAlpha.400'"
    :is-invalid="isInvalid"
    placeholder="0x0000000000000000000000000000000000000000"
    @input="updateValue"
  />
</template>
    
<script lang="js">
const ethers = require("ethers");

  export default {
    name: 'AddressInput',
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
    computed: {
      isInvalid() {
  if (!this.value.length) return false;
  try {
    ethers.utils.getAddress(this.value.toLowerCase());
    return false;
  } catch (e) {
    return true;
  }
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    