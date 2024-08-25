import { CommandPreview } from '@/components/CommandPreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { Button } from '@chakra-ui/react';
import Link from 'next/link';

type Props = {
  name: string;
  chainId: number;
  version: string;
  preset: string;
};

export default function RunPackageLocally({
  name,
  chainId,
  version,
  preset,
}: Props) {
  const _version = version !== 'latest' ? `:${version}` : '';
  const _preset = preset !== 'main' ? `@${preset}` : '';
  const _chainId = chainId != 13370 ? ` --chain-id ${chainId}` : '';

  return (
    <ItemBodyWrapper
      titleText={`Run this package on a local ${
        chainId == 13370 ? 'node' : 'fork'
      }`}
      titleAction={
        <Button
          variant="outline"
          colorScheme="white"
          size="xs"
          bg="teal.900"
          borderColor="teal.500"
          _hover={{ bg: 'teal.800' }}
          as={Link}
          href="/learn/cli/"
          textTransform="uppercase"
          letterSpacing="1px"
          pt={0.5}
          fontFamily="var(--font-miriam)"
          color="gray.200"
          fontWeight={500}
        >
          Build a cannonfile
        </Button>
      }
    >
      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />
    </ItemBodyWrapper>
  );
}
