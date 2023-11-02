import { externalLinks } from '@/constants/externalLinks';
import { SetupCustomAlert } from './SetupCustomAlert';

export const HardhatSetupPanel = () => {
  return (
    <>
      <SetupCustomAlert
        label="Hardhat sample project"
        href={externalLinks.HARDHAT_EXAMPLE}
      />
    </>
  );
};
