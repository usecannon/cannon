<template>
  <CBox mb="6" pt="6" borderTop="1px solid rgba(255,255,255,0.15)">
    <CHeading size="sm" mb="2">{{ f.name }}()</CHeading>
    <CBox v-for="(input, index) of f.inputs" :key="JSON.stringify(input)">
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
        <FunctionInput
          :input="input"
          v-on:update:value="updateParams(index, $event)"
        />
      </CFormControl>
    </CBox>
    <CBox v-if="loading" my="4"><CSpinner /></CBox>
    <CAlert mb="4" status="error" bg="red.700" v-else-if="error">
      {{ error }}
    </CAlert>
    <CBox v-else-if="result != null">
      <CBox
        mb="4"
        v-for="(output, ind) of f.outputs"
        :key="JSON.stringify(output)"
      >
        <CText display="inline" v-if="output.name">{{ output.name }}</CText>
        <CText fontSize="xs" color="whiteAlpha.700" display="inline">
          {{ output.type }}</CText
        >
        <FunctionOutput v-if="result != null" :output="result" />
      </CBox>
    </CBox>

    <CBox display="inline" v-if="readOnly && (result != null || error)">
      <div
        @click="submit(false)"
        class="refresh-button"
        v-html="$feathericons['refresh-cw'].toSvg()"
      />
    </CBox>
    <CButton
      :loading="loading"
      variant-color="teal"
      bg="teal.600"
      size="sm"
      v-else-if="!readOnly"
      @click="submit(false)"
      >Submit Transaction</CButton
    >
  </CBox>
</template>

<script lang="js">
import Vue from 'vue';
import FunctionInput from './FunctionInput';
import FunctionOutput from './FunctionOutput';
import { handleTxnError } from '@usecannon/builder';
import { debounce } from 'lodash';
const ethers = require("ethers");

const getProvider = (chainId, INFURA_ID) => {
  let provider
    if (window.metamaskProvider) {
      provider = window.metamaskProvider
    }else if (chainId == 13370) {
        provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    } else if (chainId == 420) {
        provider = new ethers.providers.JsonRpcProvider('https://goerli.optimism.io')
    }else{
      provider = ethers.getDefaultProvider(ethers.providers.getNetwork(chainId), { infura: INFURA_ID })
    }
    return provider
}

export default {
  name: 'Function',
  components: {
    FunctionInput,
    FunctionOutput
  },
  props: {
    f: {
        type: Object
    },
    address: {
        type: String
    },
    cannonOutputs: {
      type: Object
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
  watch: {
    params: debounce(function() {
      if(this.readOnly){
        this.submit()
      }
    }, 200)
  },
  computed:{
    readOnly(){
      return this.f.stateMutability == 'view' || this.f.stateMutability == 'pure'
    },
  },
  mounted(){
    if(this.readOnly && this.params.length == 0){
      this.submit(true)
    }
  },
  methods: {
    updateParams(index, value) {
      Vue.set(this.params,index, value)
    },
    async submit(supressError){
      this.error = null
      this.loading = true;

      const provider = getProvider(this.$store.getters.getChainId, this.$store.state.INFURA_ID)
      try {
        if(this.readOnly){
          const contract = new ethers.Contract(this.address, [this.f], provider);
          this.result = await contract[this.f.name](...this.params);
        }else{
          if(!this.$store.state.account){
            await this.$store.dispatch('connect')
          }else{
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
        }
      }catch(e){
        if(!supressError){
          try{
            await handleTxnError(this.cannonOutputs, provider, e)
          }catch(e2){
            this.error = e2
          }
        }
      }finally{
        this.loading = false;
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.refresh-button {
  transform: scale(0.75);
  transform-origin: center left;
  opacity: 0.75;
  transition: opacity 0.2s;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
}
</style>
