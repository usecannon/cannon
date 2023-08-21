import { FC } from 'react';
import { Container, Alert, AlertTitle } from '@chakra-ui/react';

export const UnderConstruction: FC = () => {
  return (
    <Container maxW="container.lg" mb="6">
      <Alert bg="gray.800" border="1px solid" borderColor="gray.700">
        <AlertTitle>
          🚧&nbsp;&nbsp;Cannon’s package explorer is under construction
        </AlertTitle>
      </Alert>
    </Container>
  );
};

export default UnderConstruction;
