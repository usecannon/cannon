<template>
  <CFormControl>
    <CSelect
      id="country"
      bg="black"
      borderColor="whiteAlpha.400"
      v-model="currentValue"
    >
      <option
        v-for="option of options"
        :value="JSON.stringify(option)"
        :key="JSON.stringify(option)"
      >
        {{ option.name }}
      </option>
    </CSelect>
  </CFormControl>
</template>
    
<script lang="js">
import chains from '../../../helpers/chains';

  export default {
    name: 'VersionSelect',
    props: {
      p: {
          type: Object
      },
      value:{
        type: Object
      }
    },
    data(){
      return {
        currentValue: ''
      }
    },
    mounted(){
      this.currentValue = JSON.stringify(this.options[0])
      if(!window.location.hash){
        this.$router.push({ hash: this.options[0].ipfs.replace("ipfs://","")})
      }else{
        const targetUrl = window.location.hash.replace('#',"ipfs://").split('-')[0]
        this.currentValue = JSON.stringify(this.options.find(o => o.ipfs == targetUrl))
      }
    },
    watch: {
      options(){
        this.currentValue = JSON.stringify(this.options[0])
      },
      currentValue(){
        this.$emit('input', JSON.parse(this.currentValue));
        let address = ''
        if(window.location.hash.replace('#',"ipfs://").split('-')[1]){
          address = '-' + window.location.hash.replace('#',"ipfs://").split('-')[1]
        }
        this.$router.push({ hash: JSON.parse(this.currentValue).ipfs.replace("ipfs://","") + address})
      }
    },
    computed: {
      options() {
        return _.flatten(this.p.tags.map(t => {
          return t.variants.sort((a,b)=> a.chain_id > b.chain_id ? 1 : -1).map(v => {
            return {
              name: `${t.name} on ${chains[v.chain_id].name}${v.preset !== 'main' ? ' ('+v.preset+')': ''}`,
              tag: t.name,
              preset: v.preset,
              chain_id: v.chain_id,
              ipfs: v.deploy_url,
              last_updated: v.last_updated
            }
          })
        }))
      }
    }
  }
</script>
    