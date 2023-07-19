<template>
  <div>
    <div v-if="isArray(output)">
      <div v-for="(item, index) in output" :key="index">
        <h4>
          {{ item.name }}
          <CText fontSize="xs" color="whiteAlpha.700" display="inline">{{
            item.internalType
          }}</CText>
        </h4>
        <div v-if="item.components">
          <div v-if="item.type==='tuple'">
            <div
              v-for="(component, componentIndex) in result"
              :key="componentIndex"
            >
              <FunctionOutput
                v-bind:output="item.components[componentIndex]"
                v-bind:result="component"
              />
            </div>
          </div>
          <div v-else-if="item.type==='tuple[]'">
            <div v-for="(resultItem, resultItemIndex) in (output.length > 1 ? result[index] : result)">
              <CBox pl="1" pt="2" pb="2">
                <div
                  v-for="(component, componentIndex) in resultItem"
                  :key="resultItemIndex"
                >
                  <FunctionOutput
                    v-bind:output="item.components[componentIndex]"
                    v-bind:result="component"
                  />
                </div>
              </CBox>
            </div>
          </div>
          <div v-else>
              {{ result }}
            </div>
        </div>
        <div v-else>
          {{ result }}
        </div>
      </div>
    </div>
    <div v-else-if="isObject(output)">
      <div>
        {{ output.name }}: {{ result }}
        <CText fontSize="xs" color="whiteAlpha.700" display="inline">{{
          output.internalType
        }}</CText>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FunctionOutput',
  props: {
    output: {
      required: true,
    },
    result: {
      required: true,
    },
  },
  methods: {
    isArray(value) {
      return Array.isArray(value);
    },
    isObject(value) {
      return value && typeof value === 'object' && value.constructor === Object;
    },
  },
};
</script>
