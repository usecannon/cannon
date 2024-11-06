import { defineDocumentType, makeSource } from 'contentlayer/source-files';

export const Guides = defineDocumentType(() => ({
  name: 'Guides',
  contentType: 'mdx',
  filePathPattern: `**/*.mdx`,
  fields: {
    title: { type: 'string', required: true },
  },
  computedFields: {
    url: { type: 'string', resolve: (guides) => `/guides/${guides._raw.flattenedPath}` },
  },
}));

export default makeSource({ contentDirPath: 'guides', documentTypes: [Guides] });
