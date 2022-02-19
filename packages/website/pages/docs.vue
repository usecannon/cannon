<template>
  <CBox maxWidth="containers.lg" mx="auto" px="4">
    <CGrid
      template-columns="repeat(12, 1fr)"
      gap="6"
      py="2"
      maxWidth="containers.lg"
      mx="auto"
      spacing="40px"
    >
      <CGridItem :col-span="[12, 3]">
        <CBox top="0" :position="[null, 'sticky']" :pt="[0, 8]">
          <CLink
            v-for="link of page.toc"
            :key="link.id"
            as="nuxt-link"
            fontFamily="'Miriam Libre'"
            textTransform="uppercase"
            letterSpacing="1px"
            d="block"
            mb="4"
            :to="`#${link.id}`"
            :class="{
              docsnav: true,
              toc2: link.depth === 2,
              toc3: link.depth === 3,
            }"
            >{{ link.text }}</CLink
          >
        </CBox>
      </CGridItem>
      <CGridItem :col-span="[12, 9]" class="prose" :pt="[0, 8]">
        <client-only>
          <nuxt-content :document="page" />
        </client-only>
      </CGridItem>
    </CGrid>
  </CBox>
</template>

<script lang="js">
export default {
  name: 'Docs',
  async asyncData({ $content, params, error }) {
    const page = await $content('docs')
      .fetch()
      .catch(err => {
        error({ statusCode: 404, message: "Page not found" });
      });
      
    return {
      page
    };
  }
}
</script>

<style scoped lang="scss">
a.docsnav:hover {
  text-decoration: none !important;
  opacity: 0.8;
}
a.docsnav:focus {
  box-shadow: none !important;
}
a.docsnav.toc3 {
  font-size: 0.8rem;
  padding-left: 20px;
}
</style>