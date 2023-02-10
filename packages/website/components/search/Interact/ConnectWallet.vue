<template>
  <CBox>
    <CButton bg="cyan.600" variant-color="cyan" @click="connect"
      >Connect Wallet</CButton
    >
    <web3-modal-vue
      ref="web3modal"
      :provider-options="providerOptions"
      cache-provider
    />
  </CBox>
</template>
    
<script lang="js">
export default {
  name: 'ConnectWallet',
  methods:{
    async connect(){
      this.$store.dispatch('connect')
    }
  },
  computed: {
    providerOptions () {
      return this.$store.state.providerOptions
    }
  }
}
</script>