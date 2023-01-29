<template>
  <CBox>
    <CBox v-if="loading" py="20" textAlign="center">
      <CSpinner />
    </CBox>
    <CBox v-else
      ><CText mb="6">Additional information coming soon.</CText></CBox
    >

    <CDivider opacity=".3" mb="4" />
    <CText fontSize="sm" opacity=".9" mb="2">
      <strong>Metadata:</strong>
      <CLink
        v-if="latestVariant.meta_url"
        isExternal
        textDecoration="underline"
        :to="latestVariant.meta_url"
        >{{ latestVariant.meta_url }}</CLink
      >
      <CText display="inline" color="gray.400" v-else>None</CText>
    </CText>
    <CText fontSize="sm" opacity=".9" mb="2">
      <strong>Deployment Data:</strong>
      <CLink
        v-if="latestVariant.deploy_url"
        isExternal
        textDecoration="underline"
        :to="latestVariant.deploy_url"
        >{{ latestVariant.deploy_url }}</CLink
      >
      <CText display="inline" color="gray.400" v-else>None</CText>
    </CText>
  </CBox>
</template>

<script lang="js">
import axios from 'axios';

export default {
  name: 'About',
  props: {
    p: {
        type: Object
    }
  },
  data() {
    return {
      loading: true,
      deploymentData: '',
      metadata: ''
    }
  },
    async mounted(){
      const projectId = '2Bl18Q3j8iMWiU2jIWRNsHkUuy4';
      
      if(this.latestVariant.deploy_url){
      await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.latestVariant.deploy_url.replace("ipfs://",'')}`)
      .then(response => {
        this.deploymentData = response.data;
      })
      .catch(error => {
        console.error(error);
      });
    }

      if(this.latestVariant.meta_url){
        await axios.get(`https://usecannon.infura-ipfs.io/ipfs/${this.latestVariant.meta_url.replace("ipfs://",'')}`)
      .then(response => {
        this.metadata = response.data;
      })
      .catch(error => {
        console.error(error);
      });
      }
    this.loading = false;
    
  },
  computed: {
    latestVariant(){
      return this.p.tags.find(t => t.name === 'latest').variants.find(v => v.preset === 'main')
    }
  }
}
</script>
