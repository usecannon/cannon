/** @type { import('typedoc').TypeDocOptionMap */
module.exports = {
  entryPoints: ['src/schemas.zod.ts'],
  plugin: ['typedoc-plugin-zod', 'typedoc-plugin-replace-text'],
  excludeNotDocumented: true,
  sort: ['kind', 'instance-first', 'required-first'],
  hideGenerator: true,
  titleLink: 'https://usecannon.com/docs/technical-reference',
  excludeInternal: true,
  searchInComments: true,
  replaceText: {
    inIncludedFiles: true,
    replacements: [
      {
        pattern: "Type alias",
        replace: "."
      },
    ]
  }
};
