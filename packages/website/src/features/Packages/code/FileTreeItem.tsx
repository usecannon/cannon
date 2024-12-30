import { SidebarMenuItem } from '@/components/ui/sidebar';
import { FileTreeNode } from '@/features/Packages/code/type';
import { Box, Flex, Text } from '@chakra-ui/react';
import { FC, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FolderIcon, FileIcon } from 'lucide-react';

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
        <Box
          pl={paddingLeft}
          py={0.5}
          cursor="pointer"
          fontSize="sm"
          _hover={{ bg: 'gray.800' }}
          onClick={() => onSelectFile(node.path, node.content)}
          fontWeight={selectedKey === node.path ? 'medium' : undefined}
          bg={selectedKey === node.path ? 'gray.800' : undefined}
        >
          <Flex alignItems="center" pl="24px">
            <FileIcon size={16} className="mr-2" />
            <Text fontSize="sm" fontWeight="medium" maxW="180px" isTruncated>
              {node.name}
            </Text>
          </Flex>
        </Box>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      <SidebarMenuItem>
        <Flex
          pl={paddingLeft}
          py={0.5}
          cursor="pointer"
          alignItems="center"
          onClick={() => setIsOpen(!isOpen)}
          _hover={{ bg: 'gray.800' }}
        >
          {isOpen ? (
            <ChevronDownIcon mr={2} boxSize={4} />
          ) : (
            <ChevronRightIcon mr={2} boxSize={4} />
          )}
          <FolderIcon size={16} className="mr-2" />
          <Text fontSize="sm" fontWeight="medium">
            {node.name}
          </Text>
        </Flex>
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
