/** @type { import('typedoc').TypeDocOptionMap */
module.exports = {
  entryPoints: ["src/schemas.zod.ts"],
  plugin: ["typedoc-plugin-zod"],
  excludeNotDocumented: true,
  sort: [
    "kind",
    "instance-first",
    "required-first"
  ],
  hideGenerator: true,
  titleLink: "https://usecannon.com/docs/technical-reference",
}
