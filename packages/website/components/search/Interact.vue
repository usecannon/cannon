<template>
  <CBox>
    <CFlex mb="4">
      <CBox>
        Use the command-line tool to interact with the contracts:
        <CommandPreview
          command="npx @usecannon/cli interact packagename:version
        --private-key"
      /></CBox>
      <CBox ml="auto">version switcher dropdown</CBox>
    </CFlex>
    <CButton mb="4" variant="outline">Connect Wallet</CButton>
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
</template>

<script lang="js">
import axios from 'axios';
import pako from "pako";
import ContractStep from "./Interact/ContractStep";
import ProvisionStep from "./Interact/ProvisionStep";
import CommandPreview from "../shared/CommandPreview";

export default {
  name: 'Interact',
  props: {
      p: {
          type: Object
      }
  },
  components: {
    ContractStep,
    ProvisionStep,
    CommandPreview
  },
  data() {
    return {
      loading: true,
      ipfs: {},

      model: {},
      state: {},
      valid: false,
      schema: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
          },
        },
      },
      uiSchema: [
        {
          component: "input",
          model: "firstName",
          fieldOptions: {
            class: ["form-control"],
            on: ["input"],
            attrs: {
              placeholder: "Please enter your name",
            },
          },
        },
      ],
    };
  },
  async mounted(){
    this.loading = true
    await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.latestVariant.deploy_url.replace("ipfs://",'')}`, { responseType: 'arraybuffer' })
    .then(response => {        
      const uint8Array = new Uint8Array(response.data);
      const inflated = pako.inflate(uint8Array);
      const raw = new TextDecoder().decode(inflated);
      this.ipfs = JSON.parse(raw);
    })
    .catch(error => {
      console.error(error);
    });
    this.loading = false;
  },
  computed: {
    latestVariant(){
      return this.p.tags.find(t => t.name === 'latest').variants.find(v => v.preset === 'main')
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
