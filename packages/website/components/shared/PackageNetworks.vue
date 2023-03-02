<template>
  <CBox verticalAlign="middle">
    <CText
      height="24px"
      fontSize="sm"
      display="inline-block"
      mr="2"
      transform="translateY(-4px)"
      opacity="0.8"
      ><strong
        >{{ download ? 'Download ' : '' }}Deployment{{
          download ? ' Data' : 's'
        }}:</strong
      ></CText
    ><CButton
      size="xs"
      mr="2"
      mb="2"
      v-for="chain in chains"
      :key="chain.id"
      :variantColor="chain.color || 'whiteAlpha'"
      :opacity="download ? '0.8' : '0.7 !important'"
      :disabled="!download"
      :class="!download && 'disabled-button'"
      @click="download && openModal(chain.url, chain.id)"
      >{{ chain.name || chain.id }}</CButton
    >
    <c-modal size="5xl" :is-open="isOpen" :on-close="closeModal">
      <c-modal-content bg="black" color="white" ref="content">
        <c-modal-header
          ><CHeading size="lg"
            >Contract Addresses + ABIs</CHeading
          ></c-modal-header
        >
        <c-modal-close-button @click="closeModal" />
        <c-modal-body>
          <CBox v-if="loading" py="20" textAlign="center">
            <CSpinner />
          </CBox>
          <CBox v-else-if="deployData">
            <CButton variant-color="teal" mb="3" bg="teal.600" @click="copy">
              <div class="copy-button" v-html="$feathericons['copy'].toSvg()" />
              &nbsp;Copy to clipboard</CButton
            >
            <client-only :placeholder="deployData">
              <prism-editor
                class="code-editor"
                v-model="deployData"
                :highlight="highlighter"
              ></prism-editor>
            </client-only>
          </CBox>
          <CBox v-else textAlign="center" py="20" opacity="0.5"
            >Contract Addresses & ABIs unavailable</CBox
          >
        </c-modal-body>
      </c-modal-content>
      <c-modal-overlay bg="blue.900" opacity="0.66" />
    </c-modal>
  </CBox>
</template>

<script lang="js">
import axios from 'axios';
import pako from "pako";
import chains from '../../helpers/chains';
import { ChainBuilderRuntime, getOutputs, ChainDefinition } from '@usecannon/builder';

// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-json';

export default {
  name: 'PackageNetworks',
  props: {
    p: {
      type: Object
    },
    download: {
      type: Boolean
    }
  },
  data () {
    return {
      loading: false,
      isOpen: false,
      deployData: '',
      deployUrl: ''
    }
  },
  components: {
    PrismEditor,
  },
  methods: {

    highlighter(code) {
      return  highlight(code, languages.json);
    },

    async openModal(url, chainId) {
      this.isOpen = true
      this.deployUrl = url

      this.loading = true
      const response = await axios.get(`https://ipfs.io/ipfs/${url.replace("ipfs://",'')}`, { responseType: 'arraybuffer' })
 
      // Parse IPFS data
      const uint8Array = new Uint8Array(response.data);
      const inflated = pako.inflate(uint8Array);
      const raw = new TextDecoder().decode(inflated);
      this.ipfs = JSON.parse(raw);

      // Get Builder Outputs
      const runtime = new ChainBuilderRuntime(
      {
        provider: {},
        chainId,
        baseDir: null,
        snapshots: false,
        allowPartialDeploy: false,
      }
      );
      let cannonOutputs = await getOutputs(runtime, new ChainDefinition(this.ipfs.def), this.ipfs.state);

      this.deployData = JSON.stringify(cannonOutputs.contracts, null, 2)

      this.loading = false;
    },
    closeModal() {
      this.isOpen = false
      this.deployUrl = ''
    },
    copy(){
      var textToCopy = this.deployData;

      this.$toast({
        title: `Copied to clipboard`,
        status: 'info',
        duration: 4000
      })

    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        // navigator clipboard api method'
        return navigator.clipboard.writeText(textToCopy);
    } else {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            // here the magic happens
            document.execCommand('copy') ? res() : rej();
            textArea.remove();
        });
    }
    }
  },
  computed: {
    chains() {
      let variants =[]
      if(this.p.tags){
        const latestTag = this.p.tags.find((t) => t.name == 'latest');
        variants = latestTag?.variants?.filter((v) => v.preset == 'main');
      }else if(this.p.variants){
        variants = this.p.variants;
      }
      return variants.map(v => {return {id: v.chain_id, url: v.deploy_url, ...chains[v.chain_id]}}).sort((a, b) => {
        if (a.id === 13370) {
          return -1;
        } else if (b.id === 13370) {
          return 1;
        } else {
          return a.id - b.id;
        }
      });
    }
  }
}
</script>

<style lang="scss" scoped>
.copy-button {
  transform: scale(0.75);
}

.disabled-button {
  pointer-events: none !important;
}
</style>