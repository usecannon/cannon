import { FC, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

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
    <div>
      <p className="text-xs font-mono text-muted-foreground">
        {!p.publisher && 'last'} published
        {p.publisher && (
          <>
            {' '}
            by{' '}
            <a
              href={`https://etherscan.io/address/${p.publisher}`}
              className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              {`${p.publisher.substring(0, 6)}...${p.publisher.slice(-4)}`}
            </a>
          </>
        )}
        {lineBreak && <br />}
        {' ' + timeAgo}
      </p>
    </div>
  );
};

export default PublishInfo;
