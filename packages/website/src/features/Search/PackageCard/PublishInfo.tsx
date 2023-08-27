import { FC, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Box, Link, Text } from '@chakra-ui/react';

type PublishInfo = {
  last_updated: number;
  last_publisher?: string;
};
const PublishInfo: FC<{
  p: PublishInfo;
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
        {!p.last_publisher && 'last'} published
        {p.last_publisher && (
          <>
            {' '}
            by{' '}
            <Link
              isExternal
              styleConfig={{ 'text-decoration': 'none' }}
              borderBottom="1px dotted"
              borderBottomColor="gray.300"
              href={`https://etherscan.io/address/${p.last_publisher}`}
            >
              {`${p.last_publisher.substring(0, 6)}...${p.last_publisher.slice(
                -4
              )}`}
            </Link>
          </>
        )}
        {lineBreak && <br />}
        {' ' + timeAgo}
      </Text>
    </Box>
  );
};

export default PublishInfo;
