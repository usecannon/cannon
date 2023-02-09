<template>
  <CBox mb="6" pt="6" borderTop="1px solid rgba(255,255,255,0.3)">
    <CHeading size="sm" mb="2">{{ f.name }}()</CHeading>
    <FunctionInput
      v-for="input in f.inputs"
      :key="JSON.stringify(input.name)"
      :input="input"
    />
    <CButton variant-color="teal" bg="teal.600" size="sm">{{
      f.stateMutability == 'view' || f.stateMutability == 'pure'
        ? 'Read'
        : 'Submit Transaction'
    }}</CButton>
  </CBox>
</template>
    
<script lang="js">
import FunctionInput from './FunctionInput';

  export default {
    name: 'Function',
    components: {
      FunctionInput
    },
    props: {
        f: {
            type: Object
        }
    }
  }
  </script>
    