<template>
  <CFormControl mb="4">
    <CFormLabel color="white"
      ><CText display="inline" v-if="input.name">{{ input.name }}</CText>
      <CText
        v-if="input.type"
        fontSize="xs"
        color="whiteAlpha.700"
        display="inline"
      >
        {{ input.type }}</CText
      ></CFormLabel
    >
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
    