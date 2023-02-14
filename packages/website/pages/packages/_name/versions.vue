<template>
  <CBox pt="8" pb="2">
    <Versions :p="p" />
  </CBox>
</template>

<script lang="js">
import Versions from "../../../components/search/Versions";

export default {
  name: 'VersionsTab',
  components:{
    Versions
  },
  props: {
    p: {
      type: Object
    }
  }
}
</script>
