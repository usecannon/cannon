<template>
  <CBox v-if="variant">
    <CBox v-if="variant.chain_id == 13370">
      <CText mb="1">Run a local node to interact with below:</CText>
      <CommandPreview
        :command="`npx @usecannon/cli ${packageName}${
          variant.tag !== 'latest' ? ':' + variant.tag : ''
        } ${variant.preset !== 'main' ? '--preset ' + variant.preset : ''}`"
      />
    </CBox>
    <CBox v-else>
      <CText mb="1"
        >You can also interact with the contracts using the CLI:</CText
      >
      <CommandPreview
        :command="`npx @usecannon/cli interact ${packageName}${
          variant.tag !== 'latest' ? ':' + variant.tag : ''
        } --network RPC_ENDPOINT ${
          variant.preset !== 'main' ? '--preset ' + variant.preset : ''
        } --private-key OPTIONAL_SIGNER_KEY`"
      />
    </CBox>
  </CBox>
</template>
      
<script lang="js">
import CommandPreview from "../../shared/CommandPreview";

export default {
  name: 'InteractCommand',
  components: {
    CommandPreview
  },
  props: {
    packageName:{
        type: String
    },
    variant: {
        type: Object
    }
  }
}
</script>