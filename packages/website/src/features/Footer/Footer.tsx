import { Button } from '@/components/ui/button';
import {
  Discord as DiscordIcon,
  Github as GithubIcon,
  Twitter as TwitterIcon,
} from '@/components/specialIcons';
import { useRouter } from 'next/router';

interface FooterProps {
  isFixed?: boolean;
}

export const Footer = ({ isFixed }: FooterProps) => {
  const router = useRouter();

  const isHomePage = router.pathname == '/';

  return (
    <div
      className={`
        h-[var(--footer-height)]
        flex flex-col sm:flex-row items-center px-2 
        ${isFixed ? 'fixed bottom-0 w-full z-10' : 'relative'}
        ${isHomePage ? 'bg-transparent' : 'bg-black'}
        ${isHomePage ? '' : 'border-t border-border'} 
        pb-3 pt-2 md:py-1
      `}
    >
      <div className="flex gap-2 justify-center w-full sm:w-auto">
        <Button variant="ghost" size="icon" asChild>
          <a
            href="https://github.com/usecannon/cannon"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <a
            href="https://twitter.com/usecannon"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TwitterIcon className="h-5 w-5" />
          </a>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <a
            href="https://discord.gg/QwarFMb3dS"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DiscordIcon className="h-5 w-5" />
          </a>
        </Button>
      </div>
      <div className="sm:ml-auto sm:mr-1 text-center sm:text-left">
        <p className="font-semibold text-md tracking-wider">
          Supported by
          <a
            className="inline-block mx-1.5 text-white no-underline hover:no-underline"
            href="https://optimism.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="h-3 object-cover"
              src="/images/optimism.svg"
              alt="Optimism"
            />
          </a>
          and
          <a
            className="inline-block mx-2 text-white no-underline hover:no-underline translate-y-0.5"
            href="https://safe.global/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="h-4 object-cover"
              src="/images/safe.svg"
              alt="Safe"
            />
          </a>
        </p>
      </div>
    </div>
  );
};
