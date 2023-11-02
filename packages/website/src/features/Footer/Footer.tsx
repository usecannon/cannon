import { Flex, Box, Text, Link, Image } from '@chakra-ui/react';
import GitHubButton from 'react-github-btn';
import { DiscordButton } from '@/components/DiscordButton';

export const Footer = () => {
  return (
    <Flex
      borderTop="1px solid"
      borderColor="gray.700"
      py={[5, 5, 2]}
      px={2}
      backgroundColor="black"
      alignItems="center"
      flexDirection={['column', 'column', 'row']}
    >
      <Flex height="28px" mb={[3, 3, 0]}>
        <Box mr={2}>
          <GitHubButton
            href="https://github.com/usecannon/cannon"
            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
            data-size="large"
          >
            Cannon on GitHub
          </GitHubButton>
        </Box>
        <Box mr={2}>
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
        </Box>
        <DiscordButton />
      </Flex>
      <Box ml={[0, 0, 'auto']} mr={[0, 0, 1]}>
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
              alt="Optimism"
              objectFit="cover"
            />
          </Link>
          and
          <Link
            display="inline-block"
            isExternal
            mx="2"
            href="https://safe.global/"
            color="white"
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            transform="translateY(2px)"
          >
            <Image
              height="16px"
              src="/images/safe.svg"
              alt="Safe"
              objectFit="cover"
            />
          </Link>
        </Text>
      </Box>
    </Flex>
  );
};
