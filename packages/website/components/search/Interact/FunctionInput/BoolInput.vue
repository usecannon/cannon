<template>
  <c-select
    borderColor="whiteAlpha.400"
    bg="black"
    v-model="value"
    @input="updateValue"
  >
    <option value="false">False</option>
    <option value="true">True</option>
  </c-select>
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
        this.$emit("update:value", this.value);
      }
    },
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    
