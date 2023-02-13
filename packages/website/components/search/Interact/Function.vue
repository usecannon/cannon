<template>
  <CBox mb="6" pt="6" borderTop="1px solid rgba(255,255,255,0.15)">
    <CHeading size="sm" mb="2">{{ f.name }}()</CHeading>
    <FunctionInput
      v-for="(input, index) of f.inputs"
      :key="JSON.stringify(input)"
      :input="input"
      v-on:update:value="updateParams(index, $event)"
    />
    <CBox v-if="loading" my="4"><CSpinner /></CBox>
    <CAlert mb="4" status="error" bg="red.700" v-else-if="error">
      {{ error }}
    </CAlert>
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
        <CText>{{
          Array.isArray(result) ? result[ind] : result.toString()
        }}</CText>
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
import Vue from 'vue';
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
      result: null,
      error: null,
      params: []
    }
  },
  computed:{
    readOnly(){
      return this.f.stateMutability == 'view' || this.f.stateMutability == 'pure'
    }
  },
  methods: {
    updateParams(index, value) {
      Vue.set(this.params,index, value)
    },
    async submit(){
      this.error = null
      this.loading = true;

      try {
        if(this.readOnly){
          const provider = this.$store.getters.getProvider;
          const contract = new ethers.Contract(this.address, [this.f], provider);
          this.result = await contract[this.f.name](...this.params);
        }else{
          if(!this.$store.state.account){
            await this.$store.dispatch('connect')
          }
          const provider = this.$store.getters.getProvider;
          const signer = provider.getSigner();
          const contract = new ethers.Contract(this.address, [this.f], signer);
          await contract[this.f.name](...this.params);
          this.$toast({
            title: 'Transaction submitted',
            description: "Check your wallet app for the status of the transaction.",
            status: 'info',
            duration: 10000
          })
        }
      }catch(e){
        this.error = e
      }finally{
        this.loading = false;
      }
    }
  }
}
</script>