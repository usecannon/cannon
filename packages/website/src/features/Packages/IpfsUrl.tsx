import { FC } from 'react';
import { Text, Container, Link } from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export const IpfsUrl: FC<{
  title: string;
  url: string;
}> = ({ title, url }) => {
  const externalUrl = `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;

  return (
    <Container maxW="container.lg" mb={6}>
      <Text fontSize="lg" fontWeight={500} mb={1.5}>
        {title}
      </Text>
      <Text fontFamily="mono">
        {url}
        <Link isExternal href={externalUrl} ml={2}>
          <ExternalLinkIcon transform="translateY(-2px)" />
        </Link>
      </Text>
    </Container>
  );
};
