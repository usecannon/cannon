import { externalLinks } from '@/constants/externalLinks';
import { SetupCustomAlert } from './SetupCustomAlert';

export const HardhatSetupPanel = () => {
  return (
    <>
      <SetupCustomAlert
        label="hardhat sample project"
        href={externalLinks.HARDHAT_EXAMPLE}
      />
    </>
  );
};
