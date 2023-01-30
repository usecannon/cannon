<template>
  <CBox>
    <CText color="gray.300" fontSize="xs" fontFamily="mono"
      >published by
      <CLink
        isExternal
        :style="{ 'text-decoration': 'none' }"
        borderBottom="1px dotted rgba(255,255,255,0.8)"
        :href="`https://etherscan.io/address/${p.last_publisher}`"
        >{{ p.last_publisher.substring(0, 6) }}...{{
          p.last_publisher.slice(-4)
        }}</CLink
      ><br v-if="linebreak" />
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
    },
    linebreak: {
      type: Boolean
    }
  },
  computed: {
    timeAgo(){
      return formatDistanceToNow(new Date(this.p.last_updated * 1000), { addSuffix: true });
    }
  }
}
</script>