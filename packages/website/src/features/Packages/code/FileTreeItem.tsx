import { SidebarMenuItem } from '@/components/ui/sidebar';
import { FileTreeNode } from '@/features/Packages/code/type';
import { FC, useState } from 'react';
import { ChevronDown, ChevronRight, FileIcon, FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FileTreeItem: FC<{
  node: FileTreeNode;
  level: number;
  onSelectFile: (path: string, content: any) => void;
  selectedKey: string;
}> = ({ node, level, onSelectFile, selectedKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const paddingLeft = `${level * 12}px`;

  if (node.type === 'file') {
    return (
      <SidebarMenuItem>
        <div
          className={cn(
            'flex items-center py-0.5 cursor-pointer text-sm hover:bg-accent/50',
            selectedKey === node.path && 'font-medium bg-gray-800'
          )}
          style={{ paddingLeft }}
          onClick={() => onSelectFile(node.path, node.content)}
        >
          <div className="flex items-center pl-6">
            <FileIcon size={16} className="mr-2" />
            <span className="text-sm truncate max-w-[180px]">{node.name}</span>
          </div>
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      <SidebarMenuItem>
        <div
          className="flex items-center py-0.5 cursor-pointer hover:bg-accent/50"
          style={{ paddingLeft }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="mr-2 size-4" />
          ) : (
            <ChevronRight className="mr-2 size-4" />
          )}
          <FolderIcon size={16} className="mr-2" />
          <span className="text-sm">{node.name}</span>
        </div>
      </SidebarMenuItem>
      {isOpen && (
        <>
          {Object.values(node.children).map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onSelectFile={onSelectFile}
              selectedKey={selectedKey}
            />
          ))}
        </>
      )}
    </>
  );
};
