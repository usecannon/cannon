<template>
  <CBox>
    <CBox v-if="Array.isArray(result)">
      <CBox mb="2">
        <CText display="inline" v-if="output.name">{{ output.name }}</CText>
        <CText fontSize="xs" color="whiteAlpha.700" display="inline">
          {{ output.type }}</CText
        >
      </CBox>
      <CBox borderBottom="1px solid rgba(255,255,255,0.15)" pb="2" pl="2">
        <CBox v-for="(a, ind) in result" :key="a.toString()">
          <FunctionOutput
            :result="result[ind]"
            :output="output.components[ind]"
          />
        </CBox>
      </CBox>
    </CBox>
    <CText mb="2" v-else>
      <CBox>
        <CText display="inline" v-if="output.name">{{ output.name }}</CText>
        <CText fontSize="xs" color="whiteAlpha.700" display="inline">
          {{ output.type }}</CText
        >
      </CBox>
      <CCode variant-color="black" background="black">{{
        resultDisplay
      }}</CCode>
      <CText
        v-if="bigNumberDisplay"
        display="inline"
        fontSize="sm"
        opacity="0.5"
      >
        {{ bigNumberDisplay }} with 18 decimals
      </CText>
    </CText>
  </CBox>
</template>
    
<script lang="js">
const { ethers } = require('ethers');

export default {
  name: 'FunctionOutput',
  props: [
    'result',
    'output'
  ],
  computed: {
    bigNumberDisplay(){
      if(ethers.BigNumber.isBigNumber(this.result)){
        return ethers.utils.formatEther(this.result)
      }
    },
    resultDisplay(){
      const isString = typeof this.result == "string";
      if(isString){
        return '"' + this.result + '"'
      }else{
        return this.result.toString()
      }
    }
  }
}
</script>