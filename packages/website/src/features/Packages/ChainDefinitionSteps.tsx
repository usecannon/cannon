import { CodePreview } from '@/components/CodePreview';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  useDisclosure,
  Box,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { stringify } from '@iarna/toml';

interface Props {
  name: string;
  modules: Record<string, object>;
}

const ChainDefinitionSteps: React.FC<Props> = ({ name, modules }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeModule, setActiveModule] = useState<object | null>(null);

  return (
    <Box>
      {Object.keys(modules).map((key) => (
        <Button
          variant="outline"
          color="gray.300"
          borderColor="gray.600"
          fontFamily={'mono'}
          _hover={{ bg: 'gray.800' }}
          key={key}
          onClick={() => {
            const am: Record<string, object> = {};
            am[`${name}.${key}`] = modules[key];
            setActiveModule(am);
            onOpen();
          }}
          size="xs"
          mr={2}
          mb={2}
        >
          [{name}.{key}]
        </Button>
      ))}

      {activeModule && (
        <Modal size="4xl" isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <CodePreview
              code={stringify({ ...activeModule })}
              language="toml"
            />
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ChainDefinitionSteps;
