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
          <PackageNetworks :p="p" />
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

      <CTabs variant-color="teal">
        <CTabList>
          <CTab>Versions</CTab>
        </CTabList>
        <CTabPanels>
          <CTabPanel py="8">
            <Versions :p="p" />
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
import PackageNetworks from "../../components/shared/PackageNetworks"
import PublishInfo from "../../components/shared/PublishInfo"
import CommandPreview from "../../components/shared/CommandPreview"
import Versions from "../../components/search/Versions"

// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-toml';

var markdown = require('remarked');

export default {
  name: 'Package',
  data() {
    return {
      packages: [],
      readme: ''
    }
  },
  components: {
    PrismEditor,
    PublishInfo,
    PackageNetworks,
    CommandPreview,
    Versions
  },
  methods: {
    highlighter(code) {
      return  highlight(code, languages.toml);
    },
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
div[data-chakra-component='CTabList'] {
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
}
::v-deep button[aria-selected='true'] {
  color: #00bce6;
  border-bottom: 1px solid #00bce6;
  margin-bottom: -1px;
}
::v-deep button[data-chakra-component='CTab']:focus {
  box-shadow: none;
}
::v-deep button[data-chakra-component='CTab']:active {
  background: transparent;
}
</style>