<template>
  <CBox>
    <CBox pb="3" mb="3" v-for="tag in p.tags" :key="tag.id">
      <CHeading mb="3" size="md">{{ tag.name }}</CHeading>
      <CGrid
        pt="2"
        mb="2"
        v-for="variants in variantsByTag(tag)"
        :key="variants[0].preset"
        borderTop="1px solid"
        borderColor="gray.700"
        template-columns="repeat(12, 1fr)"
        gap="2"
      >
        <CGridItem col-span="2" pt="1">
          <CHeading size="sm" my="auto">{{ variants[0].preset }}</CHeading>
        </CGridItem>
        <CGridItem col-span="7">
          <PackageNetworks download :p="{ variants }" />
        </CGridItem>
        <CGridItem col-span="3" textAlign="right">
          <PublishInfo :linebreak="true" :p="latestVariantByTag(tag)" />
        </CGridItem>
      </CGrid>
    </CBox>
  </CBox>
</template>

<script lang="js">
import PackageNetworks from "../shared/PackageNetworks"
import PublishInfo from "../shared/PublishInfo"

export default {
  name: 'Versions',
  props: {
      p: {
          type: Object
      }
  },
  methods: {
    variantsByTag(tag){
      return _.groupBy(tag.variants, 'preset')
    },
    latestVariantByTag(tag){
      const a = this.variantsByTag(tag)
      const array = Object.values(a)[0];
      const result = array.reduce((max, current) => {
        return (current.last_updated > max.last_updated) ? current : max;
      }, array[0]);
      return result
    },
  },
  components: {
    PackageNetworks,
    PublishInfo
  }
}
</script>
