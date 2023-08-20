import { Flex, Box, Text, Link, Image } from '@chakra-ui/react';
import GitHubButton from 'react-github-btn';

export const Footer = () => {
  return (
    <Flex
      borderTop="1px solid"
      borderColor="gray.700"
      py={2}
      px={2}
      backgroundColor="black"
      alignItems="center"
    >
      <Flex height="28px">
        <Box mr={2}>
          <GitHubButton
            href="https://github.com/usecannon/cannon"
            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
            data-size="large"
          >
            Cannon on GitHub
          </GitHubButton>
        </Box>
        <GitHubButton
          href="https://github.com/usecannon/cannon"
          data-color-scheme="no-preference: dark; light: dark; dark: dark;"
          data-size="large"
          data-icon="octicon-star"
          data-show-count="true"
          aria-label="Follow @usecannon on GitHub"
        >
          Star
        </GitHubButton>
      </Flex>
      <Box ml="auto" mr="1">
        <Text
          fontWeight="600"
          fontSize="md"
          color="white"
          opacity={0.8}
          letterSpacing="0.2px"
        >
          Supported by
          <Link
            display="inline-block"
            isExternal
            mx="1.5"
            href="https://optimism.io/"
            color="white"
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
          >
            <Image
              height="12px"
              src="/images/optimism.svg"
              alt="Cannon"
              objectFit="cover"
            />
          </Link>
          RetroPGF
        </Text>
      </Box>
    </Flex>
  );
};
