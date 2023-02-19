<template>
  <CFormControl mb="4">
    <CFormLabel color="white"
      ><CText display="inline" v-if="input.name">{{ input.name }}</CText>
      <CText
        v-if="input.type"
        fontSize="xs"
        color="whiteAlpha.700"
        display="inline"
      >
        {{ input.type }}</CText
      ></CFormLabel
    >
    <CInput
      type="text"
      bg="black"
      v-model="value"
      borderColor="whiteAlpha.400"
      @input="updateValue"
    />
  </CFormControl>
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
    