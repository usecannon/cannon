<template>
  <CBox py="5" maxWidth="containers.lg" mx="auto" px="4">
    <div v-if="package">
      <CGrid
        template-columns="repeat(12, 1fr)"
        gap="6"
        py="10"
        maxWidth="containers.lg"
        mx="auto"
        spacing="40px"
        alignItems="center"
      >
        <CGridItem :col-span="[12, 9]">
          <CHeading as="h4" size="md" mb="1">{{ package.name }}</CHeading>
          <CText color="gray.300" mb="3">Description goes here...</CText>
          <CBox mb="2">
            <CTag size="sm" variantColor="blue">DEXes</CTag>
            <CTag size="sm" variantColor="blue">Lending</CTag>
          </CBox>
          <CText color="gray.300" fontSize="xs" fontFamily="mono"
            >version {{ package.version }} published by {{ package.publisher }}
            {{ timeAgo }}</CText
          >
        </CGridItem>
        <CGridItem :col-span="[12, 3]">
          <CText size="sm" mb="1">Copy and paste to something</CText>
          <CCode
            variant-color="black"
            background="black"
            py="1"
            px="3"
            width="100%"
            >npx hardhat cannon</CCode
          >
        </CGridItem>
      </CGrid>

      <CTabs variant-color="teal">
        <CTabList>
          <CTab>Readme</CTab>
          <CTab>Cannonfile</CTab>
        </CTabList>
        <CTabPanels>
          <CTabPanel py="4">
            <p>README here</p>
          </CTabPanel>
          <CTabPanel py="4">
            <p>Cannonfile (Nuxt Content already imports Prism)</p>
          </CTabPanel>
        </CTabPanels>
      </CTabs>
    </div>
    <div v-else>
      <CText textAlign="center"><CSpinner my="12" /></CText>
    </div>
  </CBox>
</template>

<script lang="js">
import gql from 'graphql-tag'
import { formatDistanceToNow } from 'date-fns'

export default {
  name: 'Package',
  data() {
    return {
      packages: []
    }
  },
  computed: {
    package(){
      return this.packages.length ? this.packages[0] : null
    },
    timeAgo(){
      return formatDistanceToNow(new Date(this.package.added * 1000), { addSuffix: true });
    }
  },
  apollo: {
    packages: {
      query: gql`query getPackage($name: String!) {
        packages(first: 1, orderDirection: desc, orderBy: added, where: {name: $name}){
          id
          name
          version
          url,
          added,
          publisher
        }
      }`,
      variables () {
        return {
          name: this.$route.params.name
        }
      }
    }
  }
}
</script>
