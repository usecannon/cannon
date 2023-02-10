<template>
  <CBox mb="6" pt="6" borderTop="1px solid rgba(255,255,255,0.15)">
    <CHeading size="sm" mb="2">{{ f.name }}()</CHeading>
    <FunctionInput
      v-for="input in f.inputs"
      :key="JSON.stringify(input)"
      :input="input"
    />
    <CBox v-if="loading" my="4"><CSpinner /></CBox>
    <CBox v-else-if="result">
      <CBox
        mb="4"
        v-for="(output, ind) of f.outputs"
        :key="JSON.stringify(output)"
      >
        <CText display="inline" v-if="output.name">{{ output.name }}</CText>
        <CText fontSize="xs" color="whiteAlpha.700" display="inline">
          {{ output.type }}</CText
        >
        <CText>{{ Array.isArray(result) ? result[ind] : result }}</CText>
      </CBox>
    </CBox>
    <CButton
      :loading="loading"
      variant-color="teal"
      bg="teal.600"
      size="sm"
      @click="submit"
      >{{ readOnly ? 'Read' : 'Submit Transaction' }}</CButton
    >
  </CBox>
</template>
    
<script lang="js">
import FunctionInput from './FunctionInput';
const ethers = require("ethers");

export default {
  name: 'Function',
  components: {
    FunctionInput
  },
  props: {
    f: {
        type: Object
    },
    address: {
        type: String
    }
  },
  data(){
    return {
      loading: false,
      result: null
    }
  },
  computed:{
    readOnly(){
      return this.f.stateMutability == 'view' || this.f.stateMutability == 'pure'
    }
  },
  methods: {
    async submit(){
      this.loading = true;
      const provider = this.$store.getters.getProvider;
      const contract = new ethers.Contract(this.address, [this.f], provider);
      // try/catch below
      if(this.readOnly){
        this.result = await contract[this.f.name]();
      }else{
        // connect wallet first if necessary
        await contract[this.f.name]();
      }
      this.loading = false;
    }
  }
}
</script>