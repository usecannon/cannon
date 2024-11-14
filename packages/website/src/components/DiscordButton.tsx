import { DiscordLogoIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';

export const DiscordButton = () => {
  return (
    <Button
      asChild
      variant="outline"
      className="bg-[#1a1e23] px-1.5 pt-1.5 border-[#303539] hover:bg-[#292e33] hover:border-[#8b949e]"
    >
      <a
        href="https://discord.gg/QwarFMb3dS"
        target="_blank"
        rel="noopener noreferrer"
      >
        <DiscordLogoIcon className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
};
