import { DocsPage } from '@/features/Docs/DocsPage';
import { exportListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Documentation',
};

export default function Docs() {
  const technicalMarkdown = fs
    .readFileSync(path.join('content', 'docs-cli' + '.md'))
    .toString();

  const technicalList = exportListFromMarkdown(technicalMarkdown);

  return <DocsPage list={technicalList} md={technicalMarkdown} />;
}
