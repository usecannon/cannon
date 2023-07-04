import { externalLinks } from '@/constants/externalLinks';
import { Flex, Link } from '@chakra-ui/react';
import { GitHub } from 'react-feather';

export const GithubFooter = () => {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      gap={2}
      py={2}
      px={4}
      backgroundColor="black"
      mt={16}
    >
      <GitHub size={16} />
      <Link
        href={externalLinks.GITHUB_CANNON}
        textDecoration="underline"
        fontSize="sm"
      >
        View the Cannon Monorepo
      </Link>
    </Flex>
  );
};
