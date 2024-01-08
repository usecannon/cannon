import { CodePreview } from '@/components/CodePreview';
import { ViewIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { FC } from 'react';
import { stringify } from '@iarna/toml';

export const ViewAsCannonFileButton: FC<{
  deploymentInfo: any;
}> = ({ deploymentInfo }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        variant="outline"
        colorScheme="white"
        size="xs"
        color="gray.300"
        borderColor="gray.500"
        _hover={{ bg: 'gray.700' }}
        leftIcon={<ViewIcon />}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
      >
        View as Cannonfile
      </Button>

      <Modal size="4xl" isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent background="none">
          <Box my={12}>
            <ModalCloseButton />
            <CodePreview
              code={stringify({ ...deploymentInfo?.def })}
              language="toml"
            />
          </Box>
        </ModalContent>
      </Modal>
    </>
  );
};
