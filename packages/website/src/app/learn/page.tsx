import { DocsPage } from '@/features/Docs/DocsPage';
import { exportListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { DocsOverview } from '@/features/Docs/Pages';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
};

export default function Docs() {
  const overviewMarkdown = fs
    .readFileSync(path.join('content', 'docs-overview.mdx'))
    .toString();

  const overviewList = exportListFromMarkdown(overviewMarkdown);

  return (
    <DocsPage list={overviewList}>
      <DocsOverview />
    </DocsPage>
  );
}
