<template>
  <CFormControl mb="2">
    <CFormLabel v-if="input.name" color="white">{{ input.name }}</CFormLabel>
    <CInput size="xs" />
  </CFormControl>
</template>
    
<script lang="js">
  export default {
    name: 'FunctionInput',
    props: {
        input: {
            type: Object
        }
    }
  }
  </script>
    