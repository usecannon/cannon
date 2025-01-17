import { isCannonFileURL } from '@/helpers/isCannonFileURL';

export type CannonfileGitInfo = {
  gitUrl: string;
  gitRef: string;
  gitFile: string;
};

const EMPTY_GIT_INFO: CannonfileGitInfo = {
  gitUrl: '',
  gitRef: '',
  gitFile: '',
};

export function useGitInfoFromCannonFileUrl(cannonfileUrlInput: string): CannonfileGitInfo {
  if (!isCannonFileURL(cannonfileUrlInput) || !cannonfileUrlInput.includes('/blob/')) {
    return EMPTY_GIT_INFO;
  }

  const [url, blobPath] = cannonfileUrlInput.split('/blob/');
  const urlComponents = blobPath.split('/');
  const branchName = urlComponents[0];
  const filePath = urlComponents.slice(1).join('/');

  return {
    gitUrl: url,
    gitRef: branchName,
    gitFile: filePath,
  };
}
