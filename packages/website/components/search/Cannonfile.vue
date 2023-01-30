<template>
  <CBox>
    <CBox v-if="loading" py="20" textAlign="center">
      <CSpinner />
    </CBox>
    <CBox v-else-if="metadata.cannonfile">
      <client-only :placeholder="metadata.cannonfile">
        <prism-editor
          class="code-editor"
          v-model="metadata.cannonfile"
          :highlight="highlighter"
        ></prism-editor>
      </client-only>
    </CBox>
    <CBox v-else textAlign="center" py="20" opacity="0.5"
      >Cannonfile unavailable</CBox
    >
  </CBox>
</template>

<script lang="js">
import axios from 'axios';
import pako from "pako";

// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-toml';

export default {
  name: 'Cannonfile',
  props: {
    p: {
        type: Object
    }
  },
  components: {
    PrismEditor,
  },
  methods: {
    highlighter(code) {
      return  highlight(code, languages.toml);
    },
  },
  data() {
    return {
      loading: true,
      metadata: {}
    }
  },
  async mounted(){
    this.loading = true
    await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.latestVariant.meta_url.replace("ipfs://",'')}`, { responseType: 'arraybuffer' })
    .then(response => {        
      const uint8Array = new Uint8Array(response.data);
      const inflated = pako.inflate(uint8Array);
      const raw = new TextDecoder().decode(inflated);
      this.metadata = JSON.parse(raw);
    })
    .catch(error => {
      console.error(error);
    });
    this.loading = false;
  },
  computed: {
    latestVariant(){
      return this.p.tags.find(t => t.name === 'latest').variants.find(v => v.preset === 'main')
    }
  }
}
</script>
