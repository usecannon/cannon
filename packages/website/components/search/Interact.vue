<template>
  <CBox>
    <CFlex mb="8" align="center">
      <ConnectWallet />
      <CBox ml="auto">
        <VersionSelect :p="p" v-model="selectedVariant" />
      </CBox>
    </CFlex>
    <CBox mb="8">
      <InteractCommand :packageName="p.name" :variant="selectedVariant" />
    </CBox>

    <CAlert
      my="8"
      status="warning"
      bg="blue.800"
      borderColor="blue.700"
      borderWidth="1px"
    >
      <CAlertIcon /><CText fontWeight="bold">
        Review high-risk transactions carefully in your wallet application prior
        to execution.</CText
      >
    </CAlert>

    <CAlert
      v-if="hasProxy"
      my="8"
      status="info"
      bg="blue.800"
      borderColor="blue.700"
      borderWidth="1px"
    >
      <CAlertIcon /><CText>
        If this protocol has a proxy contract, you should typically interact
        with it rather than the other contracts in the package.</CText
      >
    </CAlert>

    <CBox v-if="loading" py="20" textAlign="center">
      <CSpinner />
    </CBox>
    <CBox v-else>
      <CBox v-for="o in output" :key="o.title">
        <ContractStep
          v-if="o.title.startsWith('contract.')"
          :contracts="o.artifacts.contracts"
        />
        <ProvisionStep
          v-if="o.title.startsWith('provision.')"
          :imports="o.artifacts.imports"
        />
      </CBox>
    </CBox>
  </CBox>
</template>

<script lang="js">
import Vue from 'vue'
import axios from 'axios';
import pako from "pako";
import VersionSelect from "./Interact/VersionSelect";
import ContractStep from "./Interact/ContractStep";
import ProvisionStep from "./Interact/ProvisionStep";
import ConnectWallet from "./Interact/ConnectWallet";
import InteractCommand from "./Interact/InteractCommand";

export default {
  name: 'Interact',
  props: {
      p: {
          type: Object
      }
  },
  components: {
    VersionSelect,
    ContractStep,
    ProvisionStep,
    InteractCommand,
    ConnectWallet
  },
  data() {
    return {
      loading: true,
      ipfs: {},
      selectedVariant: {}
    };
  },
  watch:{
    async selectedVariant(){
      this.$store.dispatch('changeChainId', this.selectedVariant.chain_id, this.$toast)
      this.loading = true
      await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.selectedVariant.ipfs.replace("ipfs://",'')}`, { responseType: 'arraybuffer' })
      .then(response => {        
        const uint8Array = new Uint8Array(response.data);
        const inflated = pako.inflate(uint8Array);
        const raw = new TextDecoder().decode(inflated);
        this.ipfs = JSON.parse(raw);
        this.loading = false;
        Vue.nextTick(()=>{
          this.scrollToAnchor();
        })
      })
      .catch(error => {
        console.error(error);
      });
    }
  },
  methods: {
    scrollToAnchor() {
      const anchor = window.location.hash.slice(1); // remove the '#' symbol
      if (anchor) {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView();
        }
      }
    }
  },
  computed: {
    latestVariant(){
      return this.p.tags.find(t => t.name === 'latest').variants.find(v => v.preset === 'main')
    },
    hasProxy(){
      return this.ipfs.state && JSON.stringify(this.ipfs.state).toLowerCase().includes('proxy')
    },
    output(){
      if(this.ipfs.state){
      const o = Object.entries(this.ipfs.state).map(([k,v]) => {
        if(k.startsWith('contract.')){
          return {title:k, artifacts: v.artifacts}
        }else if(k.startsWith('provision.')){
          return {title:k, artifacts: v.artifacts}
        }else{
          return null
        }
      }).filter(x=>!!x);
      return o
      }
    }
  }
}
</script>
