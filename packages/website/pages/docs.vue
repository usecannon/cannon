<template>
  <CBox py="5" maxWidth="containers.lg" mx="auto" px="4">
    <CGrid
      template-columns="repeat(12, 1fr)"
      gap="6"
      py="10"
      maxWidth="containers.lg"
      mx="auto"
      spacing="40px"
    >
      <CGridItem :col-span="[12, 3]">
        <ul>
          <li
            v-for="link of page.toc"
            :key="link.id"
            :class="{ toc2: link.depth === 2, toc3: link.depth === 3 }"
          >
            <NuxtLink :to="`#${link.id}`">{{ link.text }}</NuxtLink>
          </li>
        </ul>
      </CGridItem>
      <CGridItem :col-span="[12, 9]" class="prose">
        <nuxt-content :document="page" />
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
