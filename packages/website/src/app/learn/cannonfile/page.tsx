import { DocsSpecPage } from '@/features/Docs/DocsSpecPage';
import { exportSpecListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Documentation',
};

export default function Docs() {
  const actionsMarkdown = fs
    .readFileSync(path.join('content', 'docs-actions' + '.md'))
    .toString();

  const zodMarkdown = fs
    .readFileSync(path.join('content', 'docs-configuration' + '.md'))
    .toString();

  const detailsMarkdown = fs
    .readFileSync(path.join('content', 'docs-details' + '.md'))
    .toString();

  const markdown = actionsMarkdown + zodMarkdown + detailsMarkdown;

  const configurationList = exportSpecListFromMarkdown(markdown);

  return <DocsSpecPage list={configurationList} md={markdown} />;
}
