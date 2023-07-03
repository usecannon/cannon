import { Box, Flex, Link } from "@chakra-ui/react";
import { GitHub } from "react-feather";

export const GithubFooter = () => {
  return (
    <Flex alignItems="center" justifyContent="center" gap={2} py={2} px={4}>
      <GitHub size={16} />
      <Link
        href="https://github.com/usecannon/cannon"
        textDecoration="underline"
        fontSize="sm"
      >
        View the Cannon Monorepo
      </Link>
    </Flex>
  );
};
