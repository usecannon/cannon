<template>
  <CBox position="relative">
    <CFlex
      py="6"
      mb="8"
      align="center"
      position="sticky"
      top="0"
      bg="blue.900"
      zIndex="1"
      borderBottom="1px solid rgba(255,255,255,0.25)"
    >
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
        with it instead of the other contracts in the package.</CText
      >
    </CAlert>

    <CBox v-if="loading" py="20" textAlign="center">
      <CSpinner />
    </CBox>
    <CBox v-else>
      <ProvisionStep :imports="output" :cannonOutputs="cannonOutputs" />
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
import { ChainBuilderRuntime, getOutputs, ChainDefinition } from '@usecannon/builder';

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
      selectedVariant: {},
      cannonOutputs: {}
    };
  },
  watch:{
    async selectedVariant(){
      this.$store.dispatch('changeChainId', this.selectedVariant.chain_id, this.$toast)
      this.loading = true
      const response = await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.selectedVariant.ipfs.replace("ipfs://",'')}`, { responseType: 'arraybuffer' })
 
      // Parse IPFS data
      const uint8Array = new Uint8Array(response.data);
      const inflated = pako.inflate(uint8Array);
      const raw = new TextDecoder().decode(inflated);
      this.ipfs = JSON.parse(raw);

      // Get Builder Outputs
      const runtime = new ChainBuilderRuntime(
      {
        provider: {},
        chainId: this.selectedVariant.chain_id,
        baseDir: null,
        snapshots: false,
        allowPartialDeploy: false,
      }
      );
      this.cannonOutputs = await getOutputs(runtime, new ChainDefinition(this.ipfs.def), this.ipfs.state);

      this.loading = false;
      Vue.nextTick(()=>{
        this.scrollToAnchor();
      })

    }
  },
  methods: {
    scrollToAnchor() {
      const anchor = window.location.hash.slice(1); // remove the '#' symbol
      if (anchor) {
        const element = document.getElementById(anchor);
        if (element) {
          element.scrollIntoView();
          window.scrollBy(0, -120);
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
      return {'': {
        title: '',
        url: '',
        imports: this.cannonOutputs.imports,
        contracts: this.cannonOutputs.contracts
      }}
    }
  }
}
</script>
