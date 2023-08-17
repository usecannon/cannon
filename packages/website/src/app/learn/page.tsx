import { DocsPage } from '@/features/Docs/DocsPage';
import { exportListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Documents',
};

export default function Docs() {
  const overviewMarkdown = fs
    .readFileSync(path.join('content', 'docs-overview' + '.md'))
    .toString();

  const overviewList = exportListFromMarkdown(overviewMarkdown);

  return <DocsPage list={overviewList} md={overviewMarkdown} />;
}
