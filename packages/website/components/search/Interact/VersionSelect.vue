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
        currentValue: {}
      }
    },
    mounted(){
      this.currentValue = JSON.stringify(this.options[0])
    },
    watch: {
      options(){
        this.currentValue = JSON.stringify(this.options[0])
      },
      currentValue(){
        this.$emit('input', JSON.parse(this.currentValue));
      }
    },
    computed: {
      options() {
        return _.flatten(this.p.tags.map(t => {
          return t.variants.sort((a,b)=> a.chaind_id > b.chain_id ? 1 : -1).map(v => {
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
    