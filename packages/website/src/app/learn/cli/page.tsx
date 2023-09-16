import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { exportListFromMarkdown } from '@/helpers/markdown';
import { DocsPage } from '@/features/Docs/DocsPage';
import { DocsCli } from '@/features/Docs/Pages';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
};

export default function Docs() {
  const technicalMarkdown = fs
    .readFileSync(path.join('content', 'docs-cli.mdx'))
    .toString();

  const technicalList = exportListFromMarkdown(technicalMarkdown);

  return (
    <DocsPage list={technicalList}>
      <DocsCli />
    </DocsPage>
  );
}
