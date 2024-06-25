import { Image } from '@chakra-ui/react';
import { FC, ComponentProps } from 'react';
import { keyframes } from '@emotion/react';

type ImageProps = ComponentProps<typeof Image>;

const pulse = keyframes`
  0% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 0.25;
  }
`;

export const CustomSpinner: FC<ImageProps> = (props) => {
  return (
    <Image
      display="block"
      src="/images/logomark.svg"
      alt="Cannon"
      h="64px"
      w="64px"
      objectFit="cover"
      animation={`${pulse} 2.5s infinite`}
      {...props}
    />
  );
};
