import GitHubButton from 'react-github-btn';
import { DiscordButton } from '@/components/DiscordButton';

interface FooterProps {
  isFixed?: boolean;
}

export const Footer = ({ isFixed }: FooterProps) => {
  return (
    <div
      className={`
        flex items-center px-2 
        ${
          isFixed
            ? 'fixed bottom-0 w-full z-10 bg-transparent'
            : 'relative bg-black'
        }
        ${!isFixed && 'border-t border-gray-700'}
        flex-col sm:flex-row
        py-5 sm:py-2
      `}
    >
      <div className="h-7 mb-3 sm:mb-0 flex">
        <div className="mr-2">
          <GitHubButton
            href="https://github.com/usecannon/cannon"
            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
            data-size="large"
          >
            Cannon on GitHub
          </GitHubButton>
        </div>
        <div className="mr-2">
          <GitHubButton
            href="https://github.com/usecannon/cannon"
            data-color-scheme="no-preference: dark; light: dark; dark: dark;"
            data-size="large"
            data-icon="octicon-star"
            data-show-count="true"
            aria-label="Follow @usecannon on GitHub"
          >
            Star
          </GitHubButton>
        </div>
        <DiscordButton />
      </div>
      <div className="sm:ml-auto sm:mr-1">
        <p className="font-semibold text-md text-white/80 tracking-wider">
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
