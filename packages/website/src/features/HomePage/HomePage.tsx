'use client';

import { links } from '@/constants/links';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Text,
  Image,
  Spinner,
} from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import CustomLinkButton from './CustomLinkButton';
import { createGlobalStyle } from 'styled-components';

const LazyLoadedIntegrationDiagram = dynamic(
  () => import('./IntegrationDiagram'),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

const LazyLoadedChainDiagram = dynamic(() => import('./ChainDiagram'), {
  ssr: false,
  loading: () => <Spinner />,
});

// Define global styles
const HomePageStyles = createGlobalStyle`

video {   
  object-fit: fit;   
  width: 100%;
  position: absolute;
  z-index: 0;
  opacity:.066;
  top:10%;
  left:0; 
  pointer-events:none;
}
video.alt {
  transform: scaleX(-1);
}
@media screen and ( min-width: 900px ) {
  video {
    top:-2%;
  }
}

`;

export default function HomePage() {
  return (
    <Flex
      flexDirection="column"
      flex={1}
      minHeight="100%"
      bg="black"
      justify="center"
    >
      <Box position="relative" zIndex={1} py={[20, 20, 48]}>
        <Container maxW="container.xl">
          <Heading
            as="h1"
            mb={[4, 4, 6]}
            fontFamily="var(--font-inter)"
            fontWeight={400}
            fontSize={['30px', '30px', '64px']}
            lineHeight={['38px', '38px', '76px']}
            letterSpacing={['-2.1px', '-2.1px', '-4.2px']}
            textShadow="0px 0px 8px rgba(63, 211, 203, 0.75);"
            maxWidth={['480px', '480px', '800px']}
          >
            Cannon manages protocol deployments on blockchains
          </Heading>
          <Heading
            as="h2"
            mb={[6, 6, 10]}
            fontFamily="var(--font-inter)"
            fontWeight={200}
            fontSize={['18px', '18px', '36px']}
            lineHeight={['23px', '23px', '46px']}
            letterSpacing={['-0.8px', '-0.8px', '-1.6px']}
            color="gray.300"
          >
            A DevOps tool for building on Ethereum
          </Heading>
          <Link href={links.LEARN} color="white" as={NextLink}>
            <Button
              colorScheme="teal"
              size={['sm', 'sm', 'lg']}
              letterSpacing="0.5px"
              fontWeight="bold"
              fontFamily="var(--font-miriam)"
              textTransform="uppercase"
            >
              Learn more
            </Button>
          </Link>
        </Container>
        <svg
          viewBox="0 0 180 100"
          style={{
            height: 0,
            width: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <filter id="noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0 0.000001"
              result="NOISE"
              numOctaves="2"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="NOISE"
              scale="30"
              xChannelSelector="R"
              yChannelSelector="R"
            />
          </filter>
        </svg>

        <Box
          display={{ base: 'none', lg: 'block' }}
          position="absolute"
          top="50%"
          transform="translateY(-50%)"
          right="0"
          style={{ filter: 'url(#noise)', pointerEvents: 'none' }}
        >
          <svg
            width="46vw"
            height="46vw"
            viewBox="0 0 62 62"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M42.1984 15.1439C44.7336 14.4668 47.0791 16.7293 46.4936 19.2873L42.2577 37.7937C41.8258 39.6807 39.9384 40.8538 38.0552 40.4057L30.9874 38.7243C27.2801 37.8424 24.3466 35.0126 23.3318 31.3394L21.3972 24.3367C20.8817 22.4708 21.9861 20.5425 23.8564 20.043L42.1984 15.1439Z"
              stroke="#7E858F"
              strokeWidth="0.15px"
              opacity="0.4"
            />
            <path
              d="M14.6917 44.8648C14.4224 46.6439 15.9899 48.1565 17.7583 47.8239L36.926 44.2186C37.3878 44.1317 37.4036 43.476 36.9465 43.367L28.4394 41.3389C24.7351 40.4557 21.8042 37.6277 20.7893 33.9572L18.4605 25.5348C18.3353 25.0819 17.6805 25.1211 17.6102 25.5857L14.6917 44.8648Z"
              stroke="#7E858F"
              strokeWidth="0.15px"
              opacity="0.4"
            />
          </svg>
        </Box>
      </Box>
      <Container
        maxWidth="container.xl"
        py={{ base: 12, lg: 24 }}
        zIndex={10}
        position="relative"
      >
        <Flex
          alignItems={{ base: 'left', lg: 'center' }}
          direction={{ base: 'column', lg: 'row' }}
          gap={6}
        >
          <Box maxWidth="580px">
            <Heading
              size="lg"
              mb={4}
              textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
              maxWidth="500px"
            >
              Build apps and bots that connect to protocols on Ethereum
            </Heading>
            <Text color="gray.300" mb={5}>
              Easily retrieve ABIs and addresses for development, testnets, and
              mainnets. Deploy packages on a local node for development with a
              single command.
            </Text>
            <CustomLinkButton href={links.GETSTARTED}>
              Run a Cannon Package
            </CustomLinkButton>
          </Box>
          <Box pl={[0, 0, 8]}>
            <Box
              border="1px solid"
              borderColor="#4e4d4d"
              borderRadius="lg"
              p={[2, 2, 4]}
              background="black"
              boxShadow="0px 0px 8px 4px rgba(26, 214, 255, 0.2)"
            >
              <Image
                mx="auto"
                width="100%"
                src="/images/terminal-example.svg"
                alt="Run protocols in your terminal"
              />
            </Box>
          </Box>
        </Flex>
      </Container>

      <Container maxWidth="container.xl" py={{ base: 12, lg: 32 }}>
        <Flex
          alignItems={{ base: 'left', lg: 'center' }}
          direction={{ base: 'column', lg: 'row-reverse' }}
          gap={6}
        >
          <Box maxWidth="520px">
            <Heading
              size="lg"
              mb={4}
              textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
              maxWidth="800px"
            >
              Write smart contracts that integrate with protocols
            </Heading>
            <Text color="gray.300" mb={5}>
              Create a Cannonfile to deploy your contracts, configuring them to
              connect with existing protocols. Publish a package for your
              project so other developers can integrate with it as well.
            </Text>
            <CustomLinkButton href={links.BUILD}>
              Build a Protocol
            </CustomLinkButton>
          </Box>
          <Box w="100%" pr={[0, 0, 20]}>
            <LazyLoadedIntegrationDiagram />
          </Box>
        </Flex>
      </Container>

      <LazyLoadedChainDiagram />

      <HomePageStyles />
      <video autoPlay muted loop>
        <source src="/videos/homepage_background.mp4" type="video/mp4" />
      </video>
      <video autoPlay muted loop className="alt">
        <source src="/videos/homepage_background.mp4#t=10" type="video/mp4" />
      </video>
    </Flex>
  );
}
