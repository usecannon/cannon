import { DocsSpecPage } from '@/features/Docs/DocsSpecPage';
import { exportSpecListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Documentation',
};

export default function Docs() {
  const configurationMarkdown = fs
    .readFileSync(path.join('content', 'docs-configuration' + '.md'))
    .toString();

  const configurationList = exportSpecListFromMarkdown(configurationMarkdown);

  return <DocsSpecPage list={configurationList} md={configurationMarkdown} />;
}
