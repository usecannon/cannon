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
import React, { useEffect, useState } from 'react';
import { stringify } from '@iarna/toml';
import { useStepModalContext } from '@/providers/stepModalProvider';

interface Props {
  name: string;
  modules: Record<string, object>;
}

const ChainDefinitionSteps: React.FC<Props> = ({ name, modules }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { activeModule, setActiveModule } = useStepModalContext();
  const [activeModuleData, setActiveModuleData] = useState<Record<
    string,
    object
  > | null>(null);

  useEffect(() => {
    if (name === activeModule?.split('.')[0]) {
      const moduleName = activeModule.split('.')[1];
      if (modules[moduleName]) {
        setActiveModuleData({ [activeModule]: modules[moduleName] });
        onOpen();
      }
    }
  }, [activeModule, modules, name, onOpen]);

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
            setActiveModule(`${name}.${key}`);
          }}
          size="xs"
          mr={2}
          mb={2}
        >
          [{name}.{key}]
        </Button>
      ))}

      {activeModuleData && (
        <Modal size="4xl" isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent background="none">
            <Box my={12}>
              <ModalCloseButton />
              <CodePreview
                code={stringify({ ...activeModuleData } as any)}
                language="toml"
              />
            </Box>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ChainDefinitionSteps;
