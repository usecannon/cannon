import { exportSpecListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import { DocsActions, DocsDetails } from '@/features/Docs/Pages';
import { DocsPage } from '@/features/Docs/DocsPage';
import { MarkdownSpec } from '@/components/MarkdownSpec';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
};

export default function Docs() {
  const actionsMarkdown = fs
    .readFileSync(path.join('content', 'docs-actions.mdx'))
    .toString();

  const zodMarkdown = fs
    .readFileSync(path.join('content', 'docs-configuration.md'))
    .toString()
    .replaceAll(
      RegExp(
        /^(Ƭ \*\*RawChainDefinition\*\*: `Object`|Ƭ \*\*Config\*\*: `Object`)$/,
        'gmi'
      ),
      ''
    )
    .replaceAll(RegExp(/\?:\sstring\s\\\|\sundefined/, 'gmi'), '?: string')
    .replaceAll(RegExp(/`Record`<`string`, /, 'gmi'), '')
    .replaceAll(RegExp(/>/, 'gmi'), '')
    .replaceAll(
      RegExp(/`string`\[\] | \[`string`, ...string\[\]\]/, 'gmi'),
      '`[string]`'
    );

  const detailsMarkdown = fs
    .readFileSync(path.join('content', 'docs-details.mdx'))
    .toString();

  const markdown = actionsMarkdown + zodMarkdown + detailsMarkdown;

  const configurationList = exportSpecListFromMarkdown(markdown);

  return (
    <DocsPage list={configurationList}>
      <DocsActions />
      <MarkdownSpec md={zodMarkdown} />
      <DocsDetails />
    </DocsPage>
  );
}
