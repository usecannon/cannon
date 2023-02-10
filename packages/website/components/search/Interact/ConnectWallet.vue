<template>
  <CBox>
    <CButton bg="cyan.600" variant-color="cyan" @click="connect">{{
      account
        ? `${account.substring(0, 6)}...${account.slice(-4)}`
        : 'Connect Wallet'
    }}</CButton>
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
    },
    account () {
      return this.$store.state.account
    }
  }
}
</script>