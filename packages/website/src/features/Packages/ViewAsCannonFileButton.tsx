import { CodePreview } from "@/components/CodePreview";
import { ViewIcon } from "@chakra-ui/icons";
import { Button, Modal, ModalCloseButton, ModalContent, ModalOverlay, useDisclosure } from "@chakra-ui/react";
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
                onClick={onOpen}
            >
                View as Cannonfile
            </Button>

            <Modal size="4xl" isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalCloseButton />
                    <CodePreview
                        code={stringify({ ...deploymentInfo?.def })}
                        language="toml"
                    />
                </ModalContent>
            </Modal>
        </>)
};