import { Image } from '@chakra-ui/react';
import { FC, ComponentProps } from 'react';
import { keyframes } from '@emotion/react';

type ImageProps = ComponentProps<typeof Image>;

const pulse = keyframes`
  0% {
    opacity: 0.08;
  }
  50% {
    opacity: 0.16;
  }
  100% {
    opacity: 0.08;
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
      animation={`${pulse} 3s infinite`}
      {...props}
    />
  );
};
