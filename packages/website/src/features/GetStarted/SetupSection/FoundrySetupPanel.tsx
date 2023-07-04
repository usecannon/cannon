import { externalLinks } from '@/constants/externalLinks';
import { SetupCustomAlert } from './SetupCustomAlert';

export const FoundrySetupPanel = () => {
  return (
    <>
      <SetupCustomAlert
        label="Foundry sample project"
        href={externalLinks.FOUNDRY_EXAMPLE}
      />
    </>
  );
};
