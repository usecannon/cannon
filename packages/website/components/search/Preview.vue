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
    <CFlex alignItems="['', 'center']" :direction="['column', 'row']" mb="2">
      <CHeading as="h4" size="md" :mb="[1, 0]">{{ p.name }}</CHeading>
      <CBox :ml="[0, 'auto']">
        <PublishInfo :p="p" />
      </CBox>
    </CFlex>
    <PackageNetworks :p="p" />
  </CBox>
</template>

<script lang="js">
import PackageNetworks from "../shared/PackageNetworks"
import PublishInfo from "../shared/PublishInfo"

export default {
  name: 'Preview',
  props: {
      p: {
          type: Object
      }
  },
  components: {
    PackageNetworks,
    PublishInfo
  }
}
</script>