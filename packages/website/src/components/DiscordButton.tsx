import { Link, Image } from '@chakra-ui/react';
import { FC } from 'react';

export const DiscordButton: FC = () => {
  return (
    <Link
      background="#1a1e23"
      px={1.5}
      pt="6px"
      border="1px solid #303539"
      borderRadius=".25em"
      isExternal
      href="https://discord.gg/RcMG8g3Gmv"
      _hover={{
        background: '#292e33',
        borderColor: '#8b949e',
      }}
    >
      <Image
        display="block"
        src="/images/discord.svg"
        alt="Join the Cannon Discord"
        h="14px"
        objectFit="contain"
      />
    </Link>
  );
};
