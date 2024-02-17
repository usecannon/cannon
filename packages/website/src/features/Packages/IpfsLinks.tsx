import { FC } from 'react';
import {
  Flex,
  Link,
  Image,
  Text,
  Box,
  Tooltip,
  useTheme,
} from '@chakra-ui/react';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { PiCheckCircleFill, PiMinusCircleFill } from 'react-icons/pi';

export const IpfsLinks: FC<{
  variant: any;
}> = ({ variant }) => {
  const theme = useTheme();
  const green500Hex = theme.colors.green[500];
  const yellow400Hex = theme.colors.yellow[400];

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
    <Flex>
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
      {deploymentInfo?.status == 'complete' && (
        <Tooltip label="This deployment is complete. The resulting chain state matches the desired chain definition.">
          <Box ml={3}>
            <PiCheckCircleFill size="20" fill={green500Hex} />
          </Box>
        </Tooltip>
      )}
      {deploymentInfo?.status == 'partial' && (
        <Tooltip label="This is a partial deployment. The resulting chain state did not completely match the desired chain definition.">
          <Box ml={3}>
            <PiMinusCircleFill size="20" fill={yellow400Hex} />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
};
