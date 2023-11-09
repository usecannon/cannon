import { FC } from 'react';
import { Container, Alert, AlertTitle } from '@chakra-ui/react';

export const UnderConstruction: FC = () => {
  return (
    <Container maxW="container.md" mb="4" mt="10">
      <Alert bg="gray.800" border="1px solid" borderColor="gray.700">
        <AlertTitle>
          🚧&nbsp;&nbsp;&nbsp;The web deployer is currently under construction.
        </AlertTitle>
      </Alert>
    </Container>
  );
};

export default UnderConstruction;
