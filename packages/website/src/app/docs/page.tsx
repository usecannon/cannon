import { DocsPage } from '@/features/Docs/DocsPage';
import { exportListFromMarkdown } from '@/helpers/markdown';
import fs from 'fs';
import path from 'path';

export default function Docs() {
  const overviewMarkdown = fs
    .readFileSync(path.join('content', 'docs-overview' + '.md'))
    .toString();

  const technicalMarkdown = fs
    .readFileSync(path.join('content', 'docs-technical' + '.md'))
    .toString();

  const overviewList = exportListFromMarkdown(overviewMarkdown);
  const technicalList = exportListFromMarkdown(technicalMarkdown);

  const contents = {
    overview: {
      list: overviewList,
      md: overviewMarkdown,
    },
    technical: {
      list: technicalList,
      md: technicalMarkdown,
    },
  };

  return <DocsPage contents={contents} />;
}
