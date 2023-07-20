import { FC, useMemo } from 'react';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import { formatDistanceToNow } from 'date-fns';
import { Box, Link, Text } from '@chakra-ui/react';

const PublishInfo: FC<{
  p: GetPackagesQuery['packages'][0];
  lineBreak?: boolean;
}> = ({ p, lineBreak = false }) => {
  const timeAgo = useMemo(
    () =>
      formatDistanceToNow(new Date(p.last_updated * 1000), {
        addSuffix: true,
      }),
    [p.last_updated]
  );

  return (
    <Box>
      <Text color="gray.300" fontSize="xs" fontFamily="mono">
        published by&nbsp;
        <Link
          isExternal
          styleConfig={{ 'text-decoration': 'none' }}
          borderBottom="1px dotted rgba(255,255,255,0.8)"
          href="`https://etherscan.io/address/${p.last_publisher}`"
        >
          {`${p.last_publisher.substring(0, 6)}...${p.last_publisher.slice(
            -4
          )}`}
        </Link>
        {lineBreak && <br />}
        {' ' + timeAgo}
      </Text>
    </Box>
  );
};

export default PublishInfo;
