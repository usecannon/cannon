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
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePackageByName } from '@/hooks/api/usePackage';

export const VersionSelect: FC<{
  pkg: any;
}> = ({ pkg }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const packagesQuery = usePackageByName({ name: pkg.name });

  if (packagesQuery.isPending) {
    return <CustomSpinner />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

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
          {pkg.version}
          {pkg?.tag}
          <Text fontSize="xs" color="gray.500" letterSpacing={'-0.3px'} mr={1}>
            {pkg?.preset}
          </Text>
          <Chain id={pkg?.chainId} />
        </Flex>
      </Button>

      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="container.lg">
          <PackageCard pkgs={packagesQuery.data.data} maxHeight={'75vh'} />
        </ModalContent>
      </Modal>
    </>
  );
};
