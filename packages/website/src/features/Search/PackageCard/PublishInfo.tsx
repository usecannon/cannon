import { FC, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Box, Link, Text } from '@chakra-ui/react';

type PublishInfo = {
  timestamp: number;
  publisher?: string;
};

const PublishInfo: FC<{
  p: PublishInfo;
  lineBreak?: boolean;
}> = ({ p, lineBreak = false }) => {
  const timeAgo = useMemo(
    () =>
      formatDistanceToNow(new Date(p.timestamp * 1000), {
        addSuffix: true,
      }),
    [p.timestamp]
  );

  return (
    <Box>
      <Text color="gray.300" fontSize="xs" fontFamily="mono">
        {!p.publisher && 'last'} published
        {p.publisher && (
          <>
            {' '}
            by{' '}
            <Link
              isExternal
              styleConfig={{ 'text-decoration': 'none' }}
              borderBottom="1px dotted"
              borderBottomColor="gray.300"
              href={`https://etherscan.io/address/${p.publisher}`}
            >
              {`${p.publisher.substring(0, 6)}...${p.publisher.slice(-4)}`}
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
