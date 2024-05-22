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
  pkg: any;
}> = ({ pkg }) => {
  const theme = useTheme();
  const green500Hex = theme.colors.green[500];
  const yellow400Hex = theme.colors.yellow[400];

  const deploymentData = useQueryIpfsData(pkg?.deployUrl, !!pkg?.deployUrl);

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
        {pkg?.deployUrl && (
          <Link
            href={convertUrl(pkg.deployUrl)}
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
        {pkg?.metaUrl && (
          <Link
            href={convertUrl(pkg.metaUrl)}
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
          <Box pl={[6, 6, 2]}>
            <PiCheckCircleFill size="20" fill={green500Hex} />
          </Box>
        </Tooltip>
      )}
      {deploymentInfo?.status == 'partial' && (
        <Tooltip label="This is a partial deployment. The resulting chain state did not completely match the desired chain definition.">
          <Box pl={[6, 6, 2]}>
            <PiMinusCircleFill size="20" fill={yellow400Hex} />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
};
