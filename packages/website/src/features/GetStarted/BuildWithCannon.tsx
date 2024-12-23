import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';

export const BuildWithCannon = () => {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-[0.2px] mb-2.5">
        Build with Cannon
      </h2>
      <p className="pb-4 mb-6 border-b border-border text-xl text-muted-foreground">
        Create and deploy a protocol that integrates with Cannon packages
      </p>
      <p className="mb-4">
        Start by installing/upgrading the Cannon{' '}
        <a href={links.CLI} className="text-primary hover:underline">
          command-line interface
        </a>
        :
      </p>
      <div className="mb-6">
        <CommandPreview command="npm i -g @usecannon/cli" />
      </div>
    </>
  );
};
