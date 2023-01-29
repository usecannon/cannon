<template>
  <CBox>
    <CText color="gray.300" fontSize="xs" fontFamily="mono"
      >published by
      <CLink
        isExternal
        textDecoration="underline"
        :href="`https://etherscan.io/address/${p.last_publisher}`"
        class="truncate"
        >{{ p.last_publisher }}</CLink
      >
      {{ timeAgo }}</CText
    >
  </CBox>
</template>

<script lang="js">
import { formatDistanceToNow } from 'date-fns'
export default {
  name: 'PublishInfo',
  props: {
    p: {
      type: Object
    }
  },
  computed: {
    timeAgo(){
      return formatDistanceToNow(new Date(this.p.last_updated * 1000), { addSuffix: true });
    }
  }
}
</script>