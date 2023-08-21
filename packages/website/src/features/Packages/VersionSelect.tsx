import { Package } from '@/types/graphql/graphql';
import { FC } from 'react';
import {
  Button,
  Text,
  Flex,
  Modal,
  ModalContent,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowUpDownIcon } from '@chakra-ui/icons';
import { PackageCard } from '@/features/Search/PackageCard/PackageCard';
import Chain from '@/features/Search/PackageCard/Chain';

export const VersionSelect: FC<{
  pkg: Package;
  currentVariant: any;
}> = ({ pkg, currentVariant }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        onClick={onOpen}
        rightIcon={<ArrowUpDownIcon h="3" opacity="0.8" />}
        colorScheme="black"
        variant="outline"
        borderColor="gray.500"
        _hover={{ bg: 'gray.900', borderColor: 'gray.500' }}
      >
        <Flex gap={1} alignItems="baseline">
          {currentVariant?.tag.name}
          <Text fontSize="xs" color="gray.500" letterSpacing={'-0.3px'} mr={1}>
            {currentVariant?.preset}
          </Text>
          <Chain id={currentVariant?.chain_id} />
        </Flex>
      </Button>

      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="container.lg">
          <PackageCard pkg={pkg} />
        </ModalContent>
      </Modal>
    </>
  );
};
