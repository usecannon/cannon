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

interface Module {
  artifact: string;
  salt?: string;
  create2?: boolean;
  args?: string[];
  abiOf?: string[];
  depends?: string[];
}

interface Props {
  modules: Record<string, Module>;
}

const ChainDefinitionSteps: React.FC<Props> = ({ modules }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  return (
    <Box>
      {Object.keys(modules).map((key) => (
        <Button
          variant="outline"
          color="gray.300"
          borderColor="gray.500"
          _hover={{ bg: 'gray.700' }}
          key={key}
          onClick={() => {
            setActiveModule(modules[key]);
            onOpen();
          }}
          size="xs"
          mr={2}
          mb={2}
        >
          {key}
        </Button>
      ))}

      {activeModule && (
        <Modal size="6xl" isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <CodePreview
              code={JSON.stringify(activeModule, null, 2)}
              language="json"
            />
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ChainDefinitionSteps;
