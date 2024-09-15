import {
  Box,
  Heading,
  Flex,
  Text,
  BoxProps,
  HeadingProps,
  FlexProps,
  TextProps,
} from '@chakra-ui/react';
import { FC, ReactNode } from 'react';

interface CardProps {
  title: string | ReactNode;
  titleExtraContent?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  titleProps?: HeadingProps;
  subtitleProps?: TextProps;
  contentProps?: BoxProps;
  containerProps?: FlexProps;
}

const Card: FC<CardProps> = ({
  title,
  titleExtraContent,
  subtitle,
  children,
  titleProps,
  subtitleProps,
  contentProps,
  containerProps,
}) => {
  return (
    <Box
      background="gray.800"
      p={4}
      borderWidth="1px"
      borderColor="gray.700"
      mb={8}
      {...containerProps}
    >
      <Flex alignItems="center" mb={3}>
        <Heading
          size="sm"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="1.5px"
          fontFamily="var(--font-miriam)"
          textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
          {...titleProps}
        >
          {title}
        </Heading>
        {titleExtraContent && titleExtraContent}
        {subtitle && (
          <Text ml="auto" {...subtitleProps}>
            {subtitle}
          </Text>
        )}
      </Flex>

      <Box {...contentProps}>{children}</Box>
    </Box>
  );
};

export default Card;
