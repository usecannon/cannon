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
      if(this.account){
        this.$store.dispatch('disconnect', this.$toast)
      }else{
        this.$store.dispatch('connect', this.$toast)
      }
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