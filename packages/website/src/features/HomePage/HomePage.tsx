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
} from '@chakra-ui/react';
import { gsap } from 'gsap';
import NextLink from 'next/link';
import { ReactNode, useEffect } from 'react';
import { IntegrationDiagram } from './IntegrationDiagram';
import { createGlobalStyle } from 'styled-components';

// Define global styles
const DeployerDiagramStyles = createGlobalStyle`
@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes pulse {
  33%, 66% {
    fill: #ffffff; /* Start and end with white */
  }
  50% {
    fill: #1ad6ff; /* Midpoint with your target color */
  }
}

.diagram-wrapper line {
  stroke-dasharray: 0.11 6.84; /* Your existing dash pattern */
  stroke-dashoffset: 6.84; /* Initial offset should match the dash pattern for smooth animation */
  animation: dash 0.33s linear infinite; /* Adjust the duration (2s) as needed */
}

.pulse {
  animation: pulse 3s infinite ease-in-out;
}

.diagram-wrapper svg {
  width: 100%;
  max-width: 480px;
  height: auto;
}

@media (max-width: 480px) {
  .diagram-wrapper svg {
    max-width: 100%;
  }
}
`;

const CustomLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <Link
    href={href}
    as={href.startsWith('https://') ? undefined : NextLink}
    isExternal={href.startsWith('https://')}
    textDecoration="none"
    borderBottom="1px solid"
    borderBottomColor="gray.600"
    _hover={{
      color: 'gray.200',
      borderBottomColor: 'teal.500',
    }}
  >
    {children}
  </Link>
);

export default function HomePage() {
  useEffect(() => {
    // Function to generate a random duration
    const randomDuration = () => 0.15 * (0.2 + Math.random());

    // Function to generate a random repeat delay
    const randomRepeatDelay = () => 1.5 * (0.2 + Math.random());

    // GSAP timeline for the combined effects
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: randomRepeatDelay(),
    });

    const turb = document.querySelector('#noise feTurbulence');
    const paths = document.querySelectorAll('svg path[stroke="#7E858F"]');

    // Combine the turbulence and color animations in the same timeline
    tl.to(turb, {
      attr: { baseFrequency: '0.3' },
      duration: randomDuration,
      onComplete: () => {
        // Update repeatDelay after each cycle
        tl.repeatDelay(randomRepeatDelay());
      },
    })
      .to(
        paths,
        {
          stroke: '#1ad6ff',
          opacity: '1',
          duration: randomDuration,
        },
        0
      ) // Synchronize with the start of turbulence animation
      .to(turb, {
        attr: { baseFrequency: '0.000001' },
        duration: randomDuration,
      })
      .to(
        paths,
        {
          stroke: '#4e4d4d',
          opacity: '1',
          duration: randomDuration,
        },
        `>-${randomDuration()}`
      ); // Offset to start before the turbulence animation ends

    return () => {
      tl.kill(); // This will kill the timeline when the component unmounts
    };
  }, []);

  return (
    <Flex
      flexDirection="column"
      flex={1}
      minHeight="100%"
      bg="black"
      justify="center"
    >
      <Box position="relative" py={[20, 20, 40]}>
        <Container maxW="container.xl" py={4}>
          <Heading
            as="h1"
            mb={[4, 4, 7]}
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
            maxW={['340px', '340px', '680px']}
          >
            <CustomLink href={links.DEPLOY}>Deploy</CustomLink> protocols and
            publish packages to the{' '}
            <CustomLink href={links.EXPLORE}>registry</CustomLink>, hosted on
            Ethereum and IPFS.
          </Heading>
          <Link href={links.GETSTARTED} color="white" as={NextLink}>
            <Button
              colorScheme="teal"
              size={['sm', 'sm', 'lg']}
              letterSpacing="0.5px"
              fontWeight="bold"
              fontFamily="var(--font-miriam)"
              textTransform="uppercase"
            >
              Get Started
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

      <Container maxWidth="container.xl" py={{ base: 12, lg: 24 }}>
        <Flex
          alignItems={{ base: 'left', lg: 'center' }}
          direction={{ base: 'column', lg: 'row' }}
          gap={6}
        >
          <Box maxWidth="580px">
            <Heading
              size="lg"
              mb={2}
              textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
              maxWidth="500px"
            >
              Build apps and bots that connect to protocols on Ethereum
            </Heading>
            <Text color="gray.300">
              Easily retrieve ABIs and addresses for development, testnets, and
              mainnets. Run packages on a local node for development with a
              single command.
            </Text>
          </Box>
          <Box pl={[0, 0, 8]}>
            <Box
              border="1px solid"
              borderColor="#4e4d4d"
              borderRadius="lg"
              p={4}
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
              mb={2}
              textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
              maxWidth="800px"
            >
              Write smart contracts that integrate with existing protocols
            </Heading>
            <Text color="gray.300">
              Create your own Cannonfile that deploys your contracts and imports
              packages for the protocols it interacts with. Publish your own
              packages to the registry after deploying your project using
              Cannon.
            </Text>
          </Box>
          <Box w="100%" pr={[0, 0, 20]}>
            <IntegrationDiagram />
          </Box>
        </Flex>
      </Container>

      <Container maxWidth="container.xl" py={{ base: 12, lg: 20 }}>
        <Flex
          alignItems={{ base: 'left', lg: 'center' }}
          direction={{ base: 'column', lg: 'row' }}
          gap={6}
          pb={[10, 10, 20]}
        >
          <Box maxWidth="640px">
            <Heading
              size="lg"
              mb={2}
              textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
            >
              Manage complex deployments across multiple chains
            </Heading>
            <Text color="gray.300">
              Maintain Cannonfiles in a GitOps repository. Owners of a Safe can
              review and sign protocol changes using the Cannon web deployer.
            </Text>
          </Box>
          <Box w="100%">
            <DeployerDiagramStyles />
            <Flex
              className="diagram-wrapper"
              width="100%"
              justifyContent="center"
              transform={['', '', 'scale(1.1)']}
            >
              <svg
                width="480"
                height="274"
                viewBox="0 0 480 274"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_1_2)">
                  <rect
                    width="480"
                    height="273.634"
                    transform="translate(0 0.365784)"
                    fill="black"
                  />
                  <line
                    x1="40.4751"
                    y1="138.893"
                    x2="309.549"
                    y2="138.893"
                    stroke="white"
                    stroke-width="3.42043"
                    stroke-linecap="round"
                    stroke-dasharray="0.11 6.84"
                  />
                  <line
                    x1="312.969"
                    y1="138.893"
                    x2="440.665"
                    y2="138.893"
                    stroke="#1AD6FF"
                    stroke-width="3.42043"
                    stroke-linecap="round"
                    stroke-dasharray="0.11 6.84"
                  />
                  <line
                    x1="311.539"
                    y1="139.341"
                    x2="439.973"
                    y2="37.7106"
                    stroke="#1AD6FF"
                    stroke-width="3.42043"
                    stroke-linecap="round"
                    stroke-dasharray="0.11 6.84"
                  />
                  <line
                    x2="439.987"
                    y2="236.762"
                    x1="311.645"
                    y1="144.13"
                    stroke="#1AD6FF"
                    stroke-width="3.42043"
                    stroke-linecap="round"
                    stroke-dasharray="0.11 6.84"
                  />
                  <circle
                    cx="36.4846"
                    cy="36.4846"
                    r="37.0546"
                    transform="matrix(-1 0 0 1 74.1093 100.698)"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <g clip-path="url(#clip1_1_2)">
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M37.5534 113.24C24.353 113.24 13.6817 123.953 13.6817 137.205C13.6817 147.799 20.5192 156.767 30.0045 159.94C31.1904 160.179 31.6248 159.425 31.6248 158.79C31.6248 158.235 31.5857 156.33 31.5857 154.346C24.9452 155.775 23.5624 151.489 23.5624 151.489C22.4952 148.712 20.914 147.998 20.914 147.998C18.7405 146.53 21.0723 146.53 21.0723 146.53C23.4832 146.689 24.7483 148.99 24.7483 148.99C26.8821 152.64 30.3206 151.609 31.704 150.974C31.9014 149.426 32.5342 148.355 33.206 147.76C27.9097 147.204 22.3374 145.141 22.3374 135.936C22.3374 133.317 23.2853 131.174 24.7874 129.508C24.5504 128.913 23.7202 126.452 25.0248 123.159C25.0248 123.159 27.0405 122.524 31.5852 125.619C33.531 125.095 35.5377 124.828 37.5534 124.826C39.569 124.826 41.6237 125.104 43.5211 125.619C48.0663 122.524 50.0819 123.159 50.0819 123.159C51.3866 126.452 50.5559 128.913 50.3189 129.508C51.8605 131.174 52.7694 133.317 52.7694 135.936C52.7694 145.141 47.197 147.164 41.8612 147.76C42.7309 148.514 43.4815 149.942 43.4815 152.204C43.4815 155.417 43.4424 157.997 43.4424 158.79C43.4424 159.425 43.8773 160.179 45.0627 159.941C54.548 156.766 61.3855 147.799 61.3855 137.205C61.4246 123.953 50.7142 113.24 37.5534 113.24Z"
                      fill="white"
                    />
                  </g>
                  <circle
                    cx="36.4846"
                    cy="36.4846"
                    r="37.0546"
                    transform="matrix(-1 0 0 1 216.627 100.698)"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <path
                    d="M163.406 137.068H167.529C168.76 137.068 169.758 138.097 169.758 139.366V145.535C169.758 146.804 170.756 147.833 171.987 147.833H188.39C189.622 147.833 190.62 148.861 190.62 150.131V154.381C190.62 155.65 189.622 156.678 188.39 156.678H171.038C169.806 156.678 168.823 155.65 168.823 154.381V150.971C168.823 149.701 167.825 148.801 166.594 148.801H163.407C162.175 148.801 161.177 147.772 161.177 146.503V139.339C161.177 138.07 162.174 137.068 163.406 137.068Z"
                    fill="white"
                  />
                  <path
                    d="M190.62 128.625C190.62 127.356 189.623 126.327 188.391 126.327H171.998C170.767 126.327 169.769 125.298 169.769 124.029V119.779C169.769 118.51 170.767 117.481 171.998 117.481H189.341C190.573 117.481 191.571 118.51 191.571 119.779V123.054C191.571 124.323 192.568 125.352 193.8 125.352H196.973C198.204 125.352 199.202 126.38 199.202 127.65V134.821C199.202 136.09 198.2 137.067 196.968 137.067H192.845C191.614 137.067 190.616 136.039 190.616 134.77L190.62 128.625Z"
                    fill="white"
                  />
                  <path
                    d="M182.13 132.601H178.17C176.879 132.601 175.832 133.681 175.832 135.01V139.093C175.832 140.423 176.88 141.502 178.17 141.502H182.13C183.421 141.502 184.468 140.422 184.468 139.093V135.01C184.468 133.68 183.42 132.601 182.13 132.601Z"
                    fill="white"
                  />
                  <path
                    d="M442.375 174.238C462.84 174.238 479.43 157.648 479.43 137.183C479.43 116.718 462.84 100.128 442.375 100.128C421.911 100.128 405.321 116.718 405.321 137.183C405.321 157.648 421.911 174.238 442.375 174.238Z"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <path
                    d="M431.741 146.88C429.569 146.88 427.789 146.369 426.401 145.346C425.032 144.306 424.348 142.827 424.348 140.91C424.348 140.509 424.393 140.016 424.485 139.432C424.722 138.117 425.06 136.538 425.498 134.694C426.739 129.674 429.943 127.164 435.109 127.164C436.515 127.164 437.775 127.401 438.888 127.876C440.002 128.332 440.878 129.026 441.517 129.957C442.156 130.87 442.476 131.965 442.476 133.243C442.476 133.626 442.43 134.11 442.339 134.694C442.065 136.319 441.736 137.898 441.353 139.432C440.714 141.933 439.609 143.804 438.039 145.045C436.469 146.268 434.37 146.88 431.741 146.88ZM432.125 142.937C433.147 142.937 434.014 142.635 434.726 142.033C435.456 141.431 435.977 140.509 436.287 139.267C436.707 137.551 437.026 136.054 437.245 134.776C437.318 134.393 437.355 134.001 437.355 133.599C437.355 131.938 436.488 131.107 434.753 131.107C433.731 131.107 432.855 131.408 432.125 132.011C431.413 132.613 430.901 133.535 430.591 134.776C430.263 135.999 429.934 137.497 429.605 139.267C429.532 139.632 429.496 140.016 429.496 140.417C429.496 142.097 430.372 142.937 432.125 142.937Z"
                    fill="white"
                  />
                  <path
                    d="M443.733 146.606C443.532 146.606 443.377 146.542 443.267 146.414C443.176 146.268 443.149 146.104 443.185 145.922L446.964 128.122C447.001 127.921 447.101 127.757 447.265 127.629C447.43 127.501 447.603 127.438 447.786 127.438H455.07C457.096 127.438 458.721 127.857 459.944 128.697C461.185 129.537 461.806 130.751 461.806 132.339C461.806 132.796 461.751 133.27 461.642 133.763C461.185 135.863 460.264 137.414 458.876 138.418C457.507 139.422 455.626 139.924 453.235 139.924H449.538L448.279 145.922C448.242 146.122 448.142 146.287 447.977 146.414C447.813 146.542 447.64 146.606 447.457 146.606H443.733ZM453.427 136.146C454.193 136.146 454.86 135.936 455.426 135.516C456.01 135.096 456.393 134.493 456.576 133.708C456.631 133.398 456.658 133.124 456.658 132.887C456.658 132.357 456.503 131.956 456.192 131.682C455.882 131.39 455.353 131.244 454.604 131.244H451.318L450.278 136.146H453.427Z"
                    fill="white"
                  />
                  <circle
                    cx="36.4846"
                    cy="36.4846"
                    r="37.0546"
                    transform="matrix(-1 0 0 1 478.86 199.891)"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M462.898 236.375C462.898 247.71 453.694 256.898 442.34 256.898C431.567 256.898 422.73 248.627 421.853 238.1H449.026V234.65H421.853C422.73 224.123 431.567 215.853 442.34 215.853C453.694 215.853 462.898 225.041 462.898 236.375Z"
                    fill="white"
                  />
                  <circle
                    cx="36.4846"
                    cy="36.4846"
                    r="37.0546"
                    transform="matrix(-1 0 0 1 478.86 1.50592)"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <g clip-path="url(#clip2_1_2)">
                    <path
                      d="M442.371 12.9073L442.047 14.0243V46.4342L442.371 46.7622L457.188 37.8695L442.371 12.9073Z"
                      fill="#B3B3B3"
                    />
                    <path
                      d="M442.371 12.9073L427.553 37.8695L442.371 46.7623V31.0315V12.9073Z"
                      fill="#F2F2F2"
                    />
                    <path
                      d="M442.371 49.6107L442.188 49.8365V61.3816L442.371 61.9225L457.197 40.7225L442.371 49.6107Z"
                      fill="#BDBDBA"
                    />
                    <path
                      d="M442.371 61.9224V49.6106L427.553 40.7224L442.371 61.9224Z"
                      fill="#F2F2F2"
                    />
                    <path
                      d="M442.371 46.7622L457.188 37.8696L442.371 31.0316V46.7622Z"
                      fill="#949494"
                    />
                    <path
                      d="M427.554 37.8696L442.371 46.7622V31.0316L427.554 37.8696Z"
                      fill="#D1D1D1"
                    />
                  </g>
                  <circle
                    cx="36.4846"
                    cy="36.4846"
                    r="37.0546"
                    transform="matrix(-1 0 0 1 347.743 100.698)"
                    fill="#171B21"
                    stroke="#31363C"
                    stroke-width="1.14014"
                  />
                  <path
                    d="M323.662 119.071C326.378 118.343 328.891 120.777 328.264 123.53L323.725 143.443C323.262 145.473 321.24 146.735 319.222 146.253L311.65 144.444C307.677 143.495 304.534 140.45 303.447 136.498L301.374 128.963C300.822 126.955 302.005 124.88 304.009 124.343L323.662 119.071Z"
                    fill="white"
                    className="pulse"
                  />
                  <path
                    d="M294.189 151.051C293.901 152.966 295.58 154.593 297.475 154.235L318.012 150.356C318.507 150.263 318.524 149.557 318.034 149.44L308.919 147.257C304.95 146.307 301.81 143.264 300.723 139.315L298.227 130.252C298.093 129.765 297.392 129.807 297.316 130.307L294.189 151.051Z"
                    fill="white"
                    className="pulse"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_1_2">
                    <rect
                      width="480"
                      height="273.634"
                      fill="white"
                      transform="translate(0 0.365784)"
                    />
                  </clipPath>
                  <clipPath id="clip1_1_2">
                    <rect
                      width="47.886"
                      height="46.7458"
                      fill="white"
                      transform="translate(13.6817 113.24)"
                    />
                  </clipPath>
                  <clipPath id="clip2_1_2">
                    <rect
                      width="29.6437"
                      height="49.0261"
                      fill="white"
                      transform="translate(427.553 12.9073)"
                    />
                  </clipPath>
                </defs>
              </svg>
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
