import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';

export const BuildWithCannon = () => {
  return (
    <>
      <h2 className="text-2xl font-semibold tracking-[0.2px] mb-2.5">
        Build with Cannon
      </h2>
      <div className="pb-4 mb-4 border-b border-gray-600">
        <p className="text-xl text-gray-400">
          Create and deploy a protocol that integrates with Cannon packages
        </p>
      </div>
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
