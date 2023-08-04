/** @type { import('typedoc').TypeDocOptionMap }*/
module.exports = {
  plugin: [
    'typedoc-plugin-zod',
    'typedoc-plugin-merge-modules',
    'typedoc-plugin-markdown',
  ],
  entryPoints: ['src/actions.ts', 'src/steps/*.ts'],
  exclude: ['src/steps/*.test.ts'],
  out: ['../../docs/actions'],
  githubPages: false,
  cleanOutputDir: false,
  excludeInternal: true,
  excludeNotDocumented: true,
  readme: 'none',
  sort: ['kind', 'instance-first', 'required-first'],
  searchInComments: true,
  hideGenerator: true,
  hideInPageTOC: true,
  hideBreadcrumbs: true,
  entryDocument: 'core-actions.md',
  titleLink: 'https://usecannon.com/docs/technical-reference',
  hideParameterTypesInTitle: true,
};
