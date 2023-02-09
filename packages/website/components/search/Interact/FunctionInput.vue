<template>
  <CFormControl mb="4">
    <CFormLabel v-if="input.name" color="white">{{ input.name }}</CFormLabel>
    <CInput type="text" bg="black" borderColor="whiteAlpha.400" />
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
    