export type FileTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: any;
  children: Record<string, FileTreeNode>;
};
