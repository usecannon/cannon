<template>
  <CBox pb="2">
    <Interact :p="p" />
  </CBox>
</template>

<script lang="js">
import Interact from "../../../components/search/Interact";

export default {
  name: 'InteractTab',
  components:{
    Interact
  },
  props: {
    p: {
      type: Object
    }
  }
}
</script>
