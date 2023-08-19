import { GetPackagesQuery } from '@/types/graphql/graphql';
import { FC, useEffect, useMemo } from 'react';
import chainsData from '@/constants/chainsData';
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { ArrowUpDownIcon } from '@chakra-ui/icons';
import { PackageCard } from '@/features/Search/PackageCard/PackageCard';

type Package = GetPackagesQuery['packages'][0];

export const VersionSelect: FC<{
  pkg: Package;
}> = ({ pkg }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        onClick={onOpen}
        rightIcon={<ArrowUpDownIcon h="3" opacity="0.8" />}
        colorScheme="black"
        variant="outline"
        borderColor="gray.400"
        _hover={{ bg: 'gray.900', borderColor: 'gray.500' }}
      >
        current variant
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
