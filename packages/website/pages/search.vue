<template>
  <CGrid
    template-columns="repeat(12, 1fr)"
    gap="6"
    py="10"
    maxWidth="containers.lg"
    mx="auto"
    px="4"
    spacing="40px"
  >
    <CGridItem :col-span="[12, 3]">
      <CHeading
        as="h3"
        size="sm"
        textTransform="uppercase"
        fontWeight="normal"
        letterSpacing="1px"
        mb="2"
        >Search</CHeading
      >
      <CInputGroup>
        <CInputLeftElement
          ><div
            style="
              transform: scale(0.8);
              transform-origin: center left;
              opacity: 0.66;
            "
            v-html="$feathericons['search'].toSvg()"
        /></CInputLeftElement>
        <CInput
          background="transparent"
          size="sm"
          borderColor="gray.500"
          mb="6"
          v-model="query"
        />
      </CInputGroup>
    </CGridItem>
    <CGridItem :col-span="[12, 9]">
      <CBox v-if="$apollo.loading" py="20" textAlign="center">
        <CSpinner />
      </CBox>
      <CBox textAlign="center" v-else-if="packages.length == 0" py="20"
        >No packages found.</CBox
      >
      <Preview v-else v-for="p in packages" :key="p.id" :p="p" />
    </CGridItem>
  </CGrid>
</template>

<script lang="js">
import gql from 'graphql-tag'
import Preview from "../components/search/Preview"

export default {
  name: 'Search',
  data() {
    return {
      packages: [],
      query: '',
    }
  },
  components: {
    Preview
  },
  watch: {
    query() {
      this.$apollo.queries.packages.setVariables({
        query: this.query
      })
    }
  },
  apollo: {
    packages: {
      query: gql`query getPackages($query: String!) {
        packages: packages(first: 20, orderDirection: desc, orderBy: last_updated, where: {name_contains: $query}){
          name
          last_updated
          last_publisher
          tags(orderDirection: desc, orderBy: last_updated) {
            name
            last_updated
            last_publisher
            variants(orderDirection: desc, orderBy: last_updated) {
              name
              last_updated
              last_publisher
              preset
              chain_id
            }
          }
        }
      }`,
      variables: {
        query: ''
      }
    },
  }
}
</script>
