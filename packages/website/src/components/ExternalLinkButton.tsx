import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
interface Props {
  href: string;
  className?: string;
}

export const ExternalLinkButton = ({ href, className }: Props) => {
  return (
    <Button
      size="icon"
      variant="ghost"
      className={`flex-shrink-0 h-7 w-7 bg-background border border-border ${className}`}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink
          className="h-3.5 w-3.5 text-muted-foreground"
          data-testid="external-link"
        />
      </a>
    </Button>
  );
};
