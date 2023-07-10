import { DocsPage } from '@/features/Docs/DocsPage';
import fs from 'fs';
import path from 'path';

// const titles = ['Test': ['Test Child1 ', 'Test Child2'] }];

export interface IContentList {
  [key: string]: string[];
}

export default function Docs() {
  const markdownWithMetadata = fs
    .readFileSync(path.join('content', 'docs-technical' + '.md'))
    .toString();
  const lines = markdownWithMetadata.split('\n');
  const titles = lines.filter((line) => line.startsWith('##'));
  const list: IContentList = {};
  let key = '';
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    if (title.startsWith('## ')) {
      key = title.substring(3);
      if (!list[key]) {
        list[key] = [];
      }
    }
    if (title.startsWith('### ')) {
      const child = title.substring(4);
      list[key].push(child);
    }
  }

  return <DocsPage content={markdownWithMetadata} list={list} />;
}
