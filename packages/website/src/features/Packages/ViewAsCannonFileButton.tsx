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

function omitEmptyObjects(config: { [x: string]: any }) {
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const value = config[key];
      if (
        value &&
        typeof value === 'object' &&
        Object.keys(value).length === 0
      ) {
        delete config[key];
      } else if (typeof value === 'object') {
        omitEmptyObjects(value);
      }
    }
  }
  return config;
}

export const ViewAsCannonFileButton: FC<{
  deploymentInfo: any;
}> = ({ deploymentInfo }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Deep clone the deploymentInfo.def object
  const clonedDeploymentInfoDef = deploymentInfo?.def
    ? JSON.parse(JSON.stringify(deploymentInfo.def))
    : null;

  // Apply the omitEmptyObjects function to the cloned object
  const processedDeploymentInfo = clonedDeploymentInfoDef
    ? omitEmptyObjects(clonedDeploymentInfoDef)
    : null;

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
              code={stringify(processedDeploymentInfo as any)}
              language="ini"
              height="66vh"
            />
          </Box>
        </ModalContent>
      </Modal>
    </>
  );
};
