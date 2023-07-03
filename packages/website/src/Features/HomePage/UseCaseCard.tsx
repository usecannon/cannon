import { FC, ReactNode } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import NextImage from "next/image";

interface IUseCaseCardProps {
  image: string;
  title: string;
  desc: ReactNode;
}

export const UseCaseCard: FC<IUseCaseCardProps> = ({ image, title, desc }) => {
  return (
    <Box textAlign="center">
      <Box position="relative" bottom={1} boxSize="80px" mx="auto" mb={4}>
        <NextImage src={image} alt={title} width={100} height={100} />
      </Box>
      <Heading as="h3" fontSize="md" mb={2}>
        {title}
      </Heading>
      <Text fontSize="sm">{desc}</Text>
    </Box>
  );
};
