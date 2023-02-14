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
      :is-invalid="invalid"
      type="text"
      bg="black"
      v-model="value"
      :borderColor="invalid ? 'red.400' : 'whiteAlpha.400'"
      @input="updateValue"
    />
  </CFormControl>
</template>
    
<script lang="js">
const ethers = require("ethers");

  export default {
    name: 'FunctionInput',
    data(){
      return {
        value: null
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
    },
    computed:{
      invalid(){
        return this.value && (this.input.type == 'address' && !ethers.utils.isAddress(this.value))
      }
    }
  }
  </script>
    