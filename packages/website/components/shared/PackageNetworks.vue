<template>
  <CBox>
    <CText
      fontSize="sm"
      fontWeight="600"
      display="inline-block"
      mr="2"
      transform="translateY(1px)"
      >Deployments:</CText
    >
    <CTag
      size="xs"
      mr="2"
      v-for="chain in chains"
      :key="chain.id"
      :variantColor="chain.color || 'gray'"
      opacity="0.66"
      >{{ chain.name || chain.id }}</CTag
    >
  </CBox>
</template>

<script lang="js">
export default {
  name: 'PackageNetworks',
  props: {
    p: {
      type: Object
    }
  },
  computed: {
    chains() {
      const CHAIN_DATA = {
        13370: {
          name: 'local',
          color: 'whiteAlpha'
        },
        1: {
          name: 'mainnet',
          color: 'indigo'
        },
        5: {
          name: 'goerli',
          color: 'green'
        },
        10: {
          name: 'optimism',
          color: 'red'
        },
        420: {
          name: 'optimism goerli',
          color: 'pink'
        }
      }
      let variants =[]
      if(this.p.tags){
        const latestTag = this.p.tags.find((t) => t.name == 'latest');
        variants = latestTag?.variants?.filter((v) => v.preset == 'main');
      }else if(this.p.variants){
        variants = this.p.variants;
      }
      return variants.map(v => {return {id: v.chain_id, ...CHAIN_DATA[v.chain_id]}})
    }
  }
}
</script>