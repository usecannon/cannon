'use client';

import { links } from '@/constants/links';
import { Button } from '@/components/ui/button';
import NextLink from 'next/link';
import { createGlobalStyle } from 'styled-components';
import { useEffect } from 'react';

// Define global styles
const HomePageStyles = createGlobalStyle`
  html, body {
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
    height: 100dvh;
    overflow-x: hidden;
  }

  .background-video {
    position: fixed;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    object-fit: cover;
    object-position: center;
    z-index: 0;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;

    &:nth-child(1) {
      @media (max-width: 768px) {
        object-position: 75% center;
        }
      }

      &:nth-child(2) {
        @media (max-width: 768px) {
          object-position: 0% center;
          }
        }

      &:nth-child(4) {
        @media (max-width: 768px) {
          object-position: 10% center;
          }
        }
  }

  .section {
    min-height: 100dvh;
    height: 100dvh;
    position: relative;
    z-index: 1;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    overflow: hidden;
  }
`;

export default function HomePage() {
  useEffect(() => {
    const videos = document.querySelectorAll('.background-video');

    // Create an Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Array.from(entry.target.parentElement?.children || [])
            .filter((child) => child.classList.contains('section'))
            .indexOf(entry.target);

          if (entry.isIntersecting) {
            // Fade out all videos
            videos.forEach(
              (v) => ((v as HTMLVideoElement).style.opacity = '0')
            );
            // Fade in the corresponding video
            if (videos[index]) {
              (videos[index] as HTMLVideoElement).style.opacity = '1';
            }
          }
        });
      },
      {
        threshold: 0.5, // Trigger when section is 50% visible
        root: null, // Use viewport as root
      }
    );

    // Observe all sections
    document.querySelectorAll('.section').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-black h-screen px-4">
      {/* Background videos */}
      <video className="background-video" autoPlay muted loop playsInline>
        <source
          src="/videos/bg1.mp4"
          type="video/mp4"
          media="(min-width: 769px)"
        />
        <source
          src="/videos/bg1_small.mp4"
          type="video/mp4"
          media="(max-width: 768px)"
        />
      </video>
      <video className="background-video" autoPlay muted loop playsInline>
        <source
          src="/videos/bg2.mp4"
          type="video/mp4"
          media="(min-width: 769px)"
        />
        <source
          src="/videos/bg2_small.mp4"
          type="video/mp4"
          media="(max-width: 768px)"
        />
      </video>
      <video className="background-video" autoPlay muted loop playsInline>
        <source
          src="/videos/bg3.mp4"
          type="video/mp4"
          media="(min-width: 769px)"
        />
        <source
          src="/videos/bg3_small.mp4"
          type="video/mp4"
          media="(max-width: 768px)"
        />
      </video>
      <video className="background-video" autoPlay muted loop playsInline>
        <source
          src="/videos/bg4.mp4"
          type="video/mp4"
          media="(min-width: 769px)"
        />
        <source
          src="/videos/bg4_small.mp4"
          type="video/mp4"
          media="(max-width: 768px)"
        />
      </video>

      <div className="section flex items-center">
        <div className="container max-w-7xl">
          <h1 className="mb-4 lg:mb-6 font-miriam font-normal text-[30px] lg:text-[64px] leading-[38px] lg:leading-[76px] tracking-[-2.1px] lg:tracking-[-4.2px] max-w-[480px] lg:max-w-[800px]">
            Cannon manages protocol deployments on blockchains
          </h1>
          <h2 className="mb-6 lg:mb-10 font-outfit font-extralight text-lg lg:text-4xl leading-[23px] lg:leading-[46px] tracking-[-0.8px] lg:tracking-[-1.6px] text-gray-100">
            A DevOps tool for building on Ethereum
          </h2>
          <NextLink href={links.LEARN}>
            <Button className="font-miriam uppercase tracking-wider font-bold">
              Learn more
            </Button>
          </NextLink>
        </div>
      </div>

      <div className="section flex items-center">
        <div className="container max-w-7xl">
          <div className="flex justify-end w-full">
            <div className="max-w-[640px]">
              <div className="bg-black/30 rounded-lg p-8">
                <h2 className="text-2xl lg:text-4xl mb-4 font-miriam">
                  Build apps and bots that connect to protocols on Ethereum
                </h2>
                <p className="text-gray-100 mb-5 font-outfit lg:text-2xl">
                  Easily retrieve ABIs and addresses for development, testnets,
                  and mainnets. Deploy packages on a local node for development
                  with a single command.
                </p>
                <NextLink href={links.GETSTARTED}>
                  <Button
                    className="font-miriam uppercase tracking-wider font-bold"
                    size="lg"
                  >
                    Run a Cannon Package
                  </Button>
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section flex items-center">
        <div className="container max-w-7xl">
          <div className="max-w-[600px]">
            <div className="bg-black/30 rounded-lg p-8">
              <h2 className="text-2xl lg:text-4xl mb-4 font-miriam">
                Write smart contracts that integrate with protocols
              </h2>
              <p className="text-gray-100 mb-5 font-outfit lg:text-2xl">
                Create a Cannonfile to deploy your contracts, configuring them
                to connect with existing protocols. Publish a package for your
                project so other developers can integrate with it as well.
              </p>
              <NextLink href={links.BUILD}>
                <Button className="font-miriam uppercase tracking-wider font-bold">
                  Build a Protocol
                </Button>
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      <div className="section flex items-center">
        <div className="container max-w-7xl">
          <div className="flex justify-end w-full">
            <div className="max-w-[600px]">
              <div className="bg-black/30 rounded-lg p-8">
                <h2 className="text-2xl lg:text-4xl mb-4 font-miriam">
                  Manage complex deployments across multiple chains
                </h2>
                <p className="text-gray-100 mb-5 font-outfit lg:text-2xl">
                  Maintain Cannonfiles in a GitOps repository. Owners of a Safe
                  can review and sign protocol changes using the Cannon web
                  deployer.
                </p>
                <NextLink href={links.DEPLOY}>
                  <Button className="font-miriam uppercase tracking-wider font-bold">
                    Deploy a Protocol
                  </Button>
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HomePageStyles />
    </div>
  );
}
