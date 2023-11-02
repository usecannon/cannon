import { DocsPage } from '@/features/Docs/DocsPage';
import { exportSpecListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { MarkdownSpec } from '@/components/MarkdownSpec';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
};

export default function Docs() {
  const configurationMarkdown = fs
    .readFileSync(path.join('content', 'docs-configuration.md'))
    .toString()
    .replaceAll(
      RegExp(
        /^(Ƭ \*\*RawChainDefinition\*\*: `Object`|Ƭ \*\*Config\*\*: `Object`)$/,
        'gm'
      ),
      ''
    );

  const sidebarList = exportSpecListFromMarkdown(configurationMarkdown);

  return (
    <DocsPage list={sidebarList}>
      <MarkdownSpec md={configurationMarkdown} />
    </DocsPage>
  );
}
