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
    <c-select
      borderColor="whiteAlpha.400"
      bg="black"
      v-model="value"
      @input="updateValue"
    >
      <option value="false">False</option>
      <option value="true">True</option>
    </c-select>
  </CFormControl>
</template>
    
<script lang="js">
const ethers = require("ethers");

  export default {
    name: 'BoolInput',
    data(){
      return {
        value: 'false'
      }
    },
    mounted(){
      this.updateValue()
    },
    methods: {
      updateValue() {
        this.$emit("update:value", this.value ? this.value : 'false');
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    