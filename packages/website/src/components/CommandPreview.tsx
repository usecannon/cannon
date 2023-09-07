import { Box, Text, useClipboard } from '@chakra-ui/react';
import { FC } from 'react';
import { Copy } from 'react-feather';

interface ICommandPreviewProps {
  command: string;
  className?: string;
}

export const CommandPreview: FC<ICommandPreviewProps> = ({
  command,
  className,
}) => {
  const { hasCopied, onCopy } = useClipboard(command);
  const index = command.indexOf(' ');
  const firstPart = command.substring(0, index);
  const secondPart = command.substring(index, command.length);
  return (
    <Box
      backgroundColor="gray.700"
      py={1}
      px={3}
      position="relative"
      className={className}
      borderRadius="sm"
    >
      <Text fontFamily="var(--font-mono)">
        <Text as="span" color="#61afef">
          {firstPart}
        </Text>
        <Text as="span">{secondPart}</Text>
      </Text>
      <Box
        position="absolute"
        top="10px"
        right="10px"
        cursor="pointer"
        onClick={onCopy}
      >
        {hasCopied ? <Text fontSize="xs">Copied</Text> : <Copy size={16} />}
      </Box>
    </Box>
  );
};
