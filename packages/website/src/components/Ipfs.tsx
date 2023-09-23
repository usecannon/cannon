import { Text, Badge, Link } from '@chakra-ui/react';
import { FC } from 'react';

interface IIpfsProps {
  href: string;
}

export const Ipfs: FC<IIpfsProps> = ({ href }) => {
  const externalUrl = `https://ipfs.io/ipfs/${href.replace('ipfs://', '')}`;
  return (
    <Text color="gray.300" fontSize="xs">
      <Link
        isExternal
        styleConfig={{ 'text-decoration': 'none' }}
        borderBottom="1px dotted"
        borderBottomColor="gray.300"
        href={externalUrl}
        fontFamily="mono"
      >
        {`${href.substring(0, 13)}...${href.slice(-4)}`}
      </Link>
      <Badge
        colorScheme="green"
        variant="outline"
        ml="3"
        color="green.400"
        bg="green.900"
        opacity="0.75"
      >
        X pins Detected
      </Badge>
    </Text>
  );
};
