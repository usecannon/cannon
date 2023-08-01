/** @type { import('typedoc').TypeDocOptionMap */
module.exports = {
  plugin: [
    'typedoc-plugin-zod',
    'typedoc-plugin-merge-modules',
    'typedoc-plugin-markdown'
  ],
  entryPoints: ['src/custom-steps/*.ts'],
  exclude: ['src/custom-steps/*.test.ts'],
  out: ['../../docs/actions'],
  githubPages: false,
  cleanOutputDir: false,
  excludeInternal: true,
  excludeNotDocumented: true,
  readme: 'none',
  hideInPageTOC: true,
  sort: ['kind', 'instance-first', 'required-first'],
  searchInComments: true,
  hideGenerator: true,
  hideInPageTOC: true,
  hideBreadcrumbs: true,
  entryDocument: 'custom-actions.md',
  titleLink: 'https://usecannon.com/docs/cannonfile-reference'
};
