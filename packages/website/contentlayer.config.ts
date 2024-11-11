import { defineDocumentType, defineNestedType, makeSource } from 'contentlayer/source-files';

const Nav = defineNestedType(() => ({
  name: 'Nav',
  fields: {
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    url: { type: 'string', required: true },
  },
}));

export const Guides = defineDocumentType(() => ({
  name: 'Guides',
  contentType: 'mdx',
  filePathPattern: `**/*.mdx`,
  fields: {
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    options: {
      type: 'json',
    },
    after: {
      type: 'nested',
      of: Nav,
    },
    before: {
      type: 'nested',
      of: Nav,
    },
  },
  computedFields: {
    url: { type: 'string', resolve: (guides) => `/guides/${guides._raw.flattenedPath}` },
  },
}));

export default makeSource({ contentDirPath: 'guides', documentTypes: [Guides] });
