<template>
  <CBox py="2" maxWidth="containers.lg" mx="auto" px="4">
    <div v-if="p">
      <CGrid
        template-columns="repeat(12, 1fr)"
        gap="6"
        py="8"
        maxWidth="containers.lg"
        mx="auto"
        spacing="40px"
        alignItems="center"
      >
        <CGridItem
          :col-span="[12, 7]"
          py="4"
          :pr="[0, 4]"
          :borderRight="[null, '1px solid rgba(255,255,255,0.25)']"
        >
          <CHeading as="h4" size="md" mb="1">{{ p.name }}</CHeading>
          <CBox mb="2">
            <PublishInfo :p="p" />
          </CBox>
          <PackageNetworks download :p="p" />
        </CGridItem>
        <CGridItem :col-span="[12, 5]">
          <CHeading
            as="h4"
            size="sm"
            textTransform="uppercase"
            fontWeight="normal"
            letterSpacing="1px"
            mb="2"
            >Quick Start</CHeading
          >
          <CommandPreview :command="`npx @usecannon/cli ${p.name}`" />
        </CGridItem>
      </CGrid>

      <CBox borderBottom="1px solid rgba(255,255,255,0.25)" pb="2">
        <CLink
          p="3"
          as="nuxt-link"
          :to="`/packages/${p.name}/`"
          exact
          exact-active-class="active-link"
          class="tab-link"
          >Cannonfile</CLink
        >
        <CLink
          p="3"
          as="nuxt-link"
          :to="`/packages/${p.name}/interact`"
          active-class="active-link"
          class="tab-link"
          >Interact</CLink
        >
        <CLink
          p="3"
          as="nuxt-link"
          :to="`/packages/${p.name}/versions`"
          active-class="active-link"
          class="tab-link"
          >Versions</CLink
        >
      </CBox>
      <NuxtChild :p="p" />
    </div>
    <div v-else>
      <CText textAlign="center"><CSpinner my="12" /></CText>
    </div>
  </CBox>
</template>

<script lang="js">
import gql from 'graphql-tag'
import { formatDistanceToNow } from 'date-fns'
import PackageNetworks from "../../components/shared/PackageNetworks"
import PublishInfo from "../../components/shared/PublishInfo"
import CommandPreview from "../../components/shared/CommandPreview"
import Versions from "../../components/search/Versions"
import Cannonfile from "../../components/search/Cannonfile"
import Interact from "../../components/search/Interact"

export default {
  name: 'PackageLayout',
  data() {
    return {
      packages: []
    }
  },
  components: {
    PublishInfo,
    PackageNetworks,
    CommandPreview,
    Versions,
    Cannonfile,
    Interact
  },
  computed: {
    p(){
      return this.packages.length ? this.packages[0] : null
    },
    timeAgo(){
      return formatDistanceToNow(new Date(this.p.last_updated * 1000), { addSuffix: true });
    }
  },
  apollo: {
    packages: {
      query: gql`query getPackage($name: String!) {
        packages(first: 1, orderDirection: desc, orderBy: last_updated, where: {name: $name}){
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
              deploy_url
              meta_url
            }
          }
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

<style scoped>
::v-deep .tab-link {
  position: relative;
  top: -2px;
}
::v-deep .active-link {
  color: #00bce6;
  border-bottom: 2px solid #00bce6;
}
::v-deep .tab-link:hover {
  text-decoration: none;
  opacity: 0.8;
}
::v-deep .tab-link:focus {
  box-shadow: none;
}
::v-deep .tab-link:active {
  background: transparent;
}
</style>