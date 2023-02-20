<template>
  <CBox>
    <CFlex v-if="!isArray" direction="row" align="center">
      <CFlex flex="1">
        <BoolInput
          v-if="input.type.startsWith('bool')"
          :input="getValue(input)"
          v-on:update:value="handleUpdate(null, $event)" />
        <AddressInput
          v-else-if="input.type.startsWith('address')"
          :input="getValue(input)"
          v-on:update:value="handleUpdate(null, $event)" />
        <NumberInput
          v-else-if="
            input.type.startsWith('int') || input.type.startsWith('uint')
          "
          :input="getValue(input)"
          v-on:update:value="handleUpdate(null, $event)" />
        <DefaultInput
          v-else
          :input="getValue(input)"
          v-on:update:value="handleUpdate(null, $event)"
      /></CFlex>
    </CFlex>
    <CBox v-else>
      <CFlex
        align="center"
        mb="4"
        v-for="(inp, index) of array"
        flex="1"
        :key="inp.id"
      >
        <BoolInput
          v-if="input.type.startsWith('bool')"
          :input="getValue(inp)"
          v-on:update:value="handleUpdate(index, $event)" />
        <AddressInput
          v-else-if="input.type.startsWith('address')"
          :input="getValue(inp)"
          v-on:update:value="handleUpdate(index, $event)" />
        <NumberInput
          v-else-if="
            input.type.startsWith('int') || input.type.startsWith('uint')
          "
          :input="getValue(inp)"
          v-on:update:value="handleUpdate(index, $event)" />
        <DefaultInput
          v-else
          :input="getValue(inp)"
          v-on:update:value="handleUpdate(index, $event)" />
        <CLink @click="remove(index, $event)" ml="4" v-if="array.length > 1">
          <c-icon name="close" color="red.500" /> </CLink
      ></CFlex>
    </CBox>

    <CLink v-if="isArray" @click="add()" float="right" v>
      <c-icon name="add" color="green.500" />
    </CLink>
  </CBox>
</template>
    
<script lang="js">
import Vue from 'vue';
import BoolInput from './FunctionInput/BoolInput';
import NumberInput from './FunctionInput/NumberInput';
import AddressInput from './FunctionInput/AddressInput';
import DefaultInput from './FunctionInput/DefaultInput';

export default {
  name: 'FunctionInput',
  components: {
    BoolInput,
    NumberInput,
    AddressInput,
    DefaultInput
  },
  props: {
    input: {
        type: Object
    }
  },
  data(){
    return {
      array: [{id: Date.now(), val: null}]
    }
  },
  computed: {
    isArray(){
      return this.input.type.endsWith('[]')
    }
  },
  methods: {
    handleUpdate(index, output){
      if(this.isArray){
        Vue.set(this.array, index, {id: this.array[index].id, val: output})
        this.$emit("update:value", this.array.map(a=>a.val));
      }else{
        this.$emit("update:value", output);
      }
    },
    getValue(index){
      if(this.isArray){
        this.array[index]
      }else{
        this.input
      }
    },
    add(){
      this.array.push({id: Date.now(), val: null})
      this.$emit("update:value", this.array.map(a=>a.val));
    },
    remove(index){
      this.array.splice(index, 1);
      this.$emit("update:value", this.array.map(a=>a.val));
    }
  }
}
</script>