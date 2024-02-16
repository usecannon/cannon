import { FC } from 'react';
import { Flex, Link, Image, Text } from '@chakra-ui/react';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder/src/types';

export const IpfsLinks: FC<{
  variant: any;
}> = ({ variant }) => {
  const deploymentData = useQueryIpfsData(
    variant?.deploy_url,
    !!variant?.deploy_url
  );

  const deploymentInfo = deploymentData.data
    ? (deploymentData.data as DeploymentInfo)
    : undefined;

  const convertUrl = (url: string) => {
    return `/ipfs?cid=${url.replace('ipfs://', '')}&compressed=true`;
  };

  return (
    <Flex
      gap={6}
      align="center"
      color="gray.300"
      fontSize="xs"
      fontFamily="mono"
    >
      {variant?.deploy_url && (
        <Link
          href={convertUrl(variant.deploy_url)}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          display="flex"
          alignItems="center"
        >
          <Image
            display="inline-block"
            src="/images/ipfs.svg"
            alt="IPFS"
            height="14px"
            mr={1.5}
          />
          <Text
            display="inline"
            borderBottom="1px dotted"
            borderBottomColor="gray.300"
          >
            Deployment
          </Text>
        </Link>
      )}
      {deploymentInfo?.miscUrl && (
        <Link
          href={convertUrl(deploymentInfo.miscUrl)}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          display="flex"
          alignItems="center"
        >
          <Image
            display="inline-block"
            src="/images/ipfs.svg"
            alt="IPFS"
            height="14px"
            mr={1.5}
          />
          <Text
            display="inline"
            borderBottom="1px dotted"
            borderBottomColor="gray.300"
          >
            Code
          </Text>
        </Link>
      )}
      {variant?.meta_url && (
        <Link
          href={convertUrl(variant.meta_url)}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
          display="flex"
          alignItems="center"
          mr={1}
        >
          <Image
            display="inline-block"
            src="/images/ipfs.svg"
            alt="IPFS"
            height="14px"
            mr={1.5}
          />
          <Text
            display="inline"
            borderBottom="1px dotted"
            borderBottomColor="gray.300"
          >
            Metadata
          </Text>
        </Link>
      )}
    </Flex>
  );
};
