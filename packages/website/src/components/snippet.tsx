import { cn } from '@/lib/utils';
import { CopyIcon } from '@chakra-ui/icons';
import { Button } from '@/components/ui/button';

export const Snippet = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <code
      className={cn(
        'flex justify-between items-center p-4 relative rounded bg-neutral-900 font-mono text-sm',
        className
      )}
      {...props}
    >
      {children}
      <Button
        size="icon"
        variant="link"
        onClick={() => navigator.clipboard.writeText(children as string)}
        className="text-white/50 hover:text-white hover:bg-neutral-400/10 self-start"
      >
        <CopyIcon className="size-4" />
      </Button>
    </code>
  );
};
