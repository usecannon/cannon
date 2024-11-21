import { FileTreeNode } from '@/features/Packages/code/type';

export const buildFileTree = (files: [string, any][]) => {
  const root: Record<string, FileTreeNode> = {};

  files.forEach(([path, content]) => {
    const parts = path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: index === parts.length - 1 ? 'file' : 'directory',
          content: index === parts.length - 1 ? content : undefined,
          children: {},
        };
      }
      current = current[part].children;
    });
  });

  return root;
};
