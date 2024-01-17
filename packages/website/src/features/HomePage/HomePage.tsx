'use client';

import { Flex, Button, Container, Heading, Link, Box } from '@chakra-ui/react';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { ReactNode, useEffect } from 'react';
import { gsap } from 'gsap';

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
          stroke: '#7E858F',
          opacity: '0.75',
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
      py={4}
      bg="black"
      justify="center"
    >
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
          <CustomLink href="https://deploy.usecannon.com">Deploy</CustomLink>{' '}
          protocols and publish packages to the{' '}
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
        style={{ height: 0, width: 0, visibility: 'hidden' }}
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
        style={{ filter: 'url(#noise)' }}
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
            strokeWidth="0.05px"
            opacity="0.4"
          />
          <path
            d="M14.6917 44.8648C14.4224 46.6439 15.9899 48.1565 17.7583 47.8239L36.926 44.2186C37.3878 44.1317 37.4036 43.476 36.9465 43.367L28.4394 41.3389C24.7351 40.4557 21.8042 37.6277 20.7893 33.9572L18.4605 25.5348C18.3353 25.0819 17.6805 25.1211 17.6102 25.5857L14.6917 44.8648Z"
            stroke="#7E858F"
            strokeWidth="0.05px"
            opacity="0.4"
          />
        </svg>
      </Box>
    </Flex>
  );
}
