<template>
  <CBox pt="8" pb="2">
    <Cannonfile :p="p" />
  </CBox>
</template>

<script lang="js">
import Cannonfile from "../../../components/search/Cannonfile";

export default {
  name: 'CannonfileTab',
  components:{
    Cannonfile
  },
  props: {
    p: {
      type: Object
    }
  }
}
</script>
