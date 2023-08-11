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
      <CBox opacity="0.75" v-if="packages.length"
        >Showing {{ (page - 1) * perPage + 1 }}-{{
          (page - 1) * perPage + packages.length
        }}
        of {{ totalPackages.length }} results</CBox
      >
    </CGridItem>
    <CGridItem :col-span="[12, 9]">
      <CBox v-if="$apollo.loading" py="20" textAlign="center">
        <CSpinner />
      </CBox>
      <CBox textAlign="center" v-else-if="packages.length == 0" py="20"
        >No packages found.</CBox
      >
      <CBox v-else>
        <Preview v-for="p in packages" :key="p.id" :p="p" />
        <CButton
          size="sm"
          variant-color="teal"
          bg="teal.600"
          :disabled="page === 1"
          @click="page--"
          ><c-icon transform="translateY(-1px)" name="chevron-left" />
          Previous</CButton
        >
        <CButton
          float="right"
          size="sm"
          variant-color="teal"
          bg="teal.600"
          :disabled="totalPackages.length < perPage * page"
          @click="page++"
          >Next <c-icon transform="translateY(-1px)" name="chevron-right" />
        </CButton>
      </CBox>
    </CGridItem>
  </CGrid>
</template>

<script lang="js">
import gql from 'graphql-tag'
import Preview from "../components/search/Preview"
const PER_PAGE = 20;

export default {
  name: 'Search',
  data() {
    return {
      packages: [],
      totalPackages: [],
      query: '',
      page: 1,
      perPage: PER_PAGE,
      totalResults: 0
    }
  },
  components: {
    Preview
  },
  watch: {
    query() {
      this.$apollo.queries.packages.setVariables({
        query: this.query,
        skip: 0,
        first: this.perPage,
      }).then(() => {
        this.$apollo.queries.packages.refetch();
      });
      this.$apollo.queries.totalPackages.setVariables({
        query: this.query
      }).then(() => {
        this.$apollo.queries.totalPackages.refetch();
      });
    },
    page(){
    this.$apollo.queries.packages.setVariables({
        query: this.query,
        skip: (this.page - 1) * this.perPage,
        first: this.perPage,
      }).then(() => {
        this.$apollo.queries.packages.refetch();
      });
    }
  },
  apollo: {
    packages: {
      query: gql`query getPackages($query: String!, $skip: Int!, $first: Int!) {
        packages: packages(first: $first, skip: $skip, orderDirection: desc, orderBy: last_updated, where: {name_contains: $query}){
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
        query: '',
        skip: 0,
        first: PER_PAGE
      }
    },
    totalPackages: {
      query: gql`query getTotalPackages($query: String!) {
        totalPackages: packages(where: {name_contains: $query}){
          id
        }
      }`,
      variables: {
        query: ''
      }
    }
  }
}
</script>
