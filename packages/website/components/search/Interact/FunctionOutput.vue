<template>
  <CBox>
    <CBox
      borderBottom="1px solid rgba(255,255,255,0.15)"
      pb="2"
      mb="2"
      pl="2"
      v-if="Array.isArray(output)"
    >
      <CBox v-for="a in output" :key="a.toString()">
        <FunctionOutput :output="a" />
      </CBox>
    </CBox>
    <CText v-else
      ><CCode variant-color="black" background="black">{{
        outputDisplay
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
    'output',
    'outputType'
  ],
  computed: {
    bigNumberDisplay(){
      if(ethers.BigNumber.isBigNumber(this.output)){
        return ethers.utils.formatEther(this.output)
      }
    },
    outputDisplay(){
      const isString = typeof this.output == "string";
      if(isString){
        return '"' + this.output + '"'
      }else{
        return this.output.toString()
      }
    }
  }
}
</script>