<template>
  <CBox
    p="6"
    bg="blue.975"
    d="block"
    as="nuxt-link"
    :to="'/packages/' + p.name"
    mb="5"
    borderRadius="4px"
    :_hover="{ bg: 'blue.950' }"
    transition="0.12s"
  >
    <CHeading as="h4" size="md" mb="1">{{ p.name }}</CHeading>
    <CText color="gray.300" mb="3">{{ p.description }}</CText>
    <CBox mb="2">
      <CTag
        size="sm"
        variantColor="blue"
        mr="2"
        v-for="t in p.tags"
        :key="t.tag.id"
        >{{ t.tag.id }}</CTag
      >
    </CBox>
    <CText color="gray.300" fontSize="xs" fontFamily="mono"
      >version {{ p.version }} published by
      <span class="truncate">{{ p.publisher }}</span>
      {{ timeAgo }}</CText
    >
  </CBox>
</template>

<script lang="js">
import { formatDistanceToNow } from 'date-fns'

export default {
  name: 'Preview',
  props: {
      p: {
          type: Object
      }
  },
  computed: {
    timeAgo(){
      return formatDistanceToNow(new Date(this.p.added * 1000), { addSuffix: true });
    }
  }
}
</script>
