/** @type { import('typedoc').TypeDocOptionMap */
module.exports = {
  plugin: ['typedoc-plugin-zod', 'typedoc-plugin-merge-modules'],
  entryPoints: ['src/custom-steps/*.ts'],
  exclude: ['src/custom-steps/*.test.ts'],
  githubPages: false,
  cleanOutputDir: false,
  excludeInternal: true,
  excludeNotDocumented: true,
  sort: ['kind', 'instance-first', 'required-first'],
  searchInComments: true,
  hideGenerator: true,
  titleLink: 'https://usecannon.com/docs/technical-reference',
};
