import { CopyIcon } from '@chakra-ui/icons';
import { Button } from '@/components/ui/button';

export const Snippet = ({ children }: { children: React.ReactNode }) => {
  return (
    <code className="flex justify-between items-center p-4 relative rounded bg-neutral-900 font-mono text-sm">
      {children}
      {/* The styles of the interaction should be defined in the component itself.
          But don't know if this is going to change so left it here. */}
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
