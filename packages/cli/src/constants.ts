import path from 'node:path';
import os from 'node:os';

import Debug from 'debug';
const debug = Debug('cannon:cli:constants');

export const DEFAULT_CANNON_DIRECTORY = path.join(os.homedir(), '.local', 'share', 'cannon');
export const DEFAULT_REGISTRY_PROVIDER_URL = 'https://ethereum.publicnode.com/';
export const DEFAULT_ETHERSCAN_API_URL = '';
export const DEFAULT_REGISTRY_ADDRESS = '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba';
export const CLI_SETTINGS_STORE = 'settings.json';

export function getCannonRepoRegistryUrl() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // to avoid DST issues we choose a time in the middle of the winter (obviousy this doesn't work for southern tzs but those arent relevant anyway)
  const shHistoricalOffset = new Date('2023-01-01').getTimezoneOffset();

  debug(`timezone for repo resolve is ${tz}`);

  let region = 'us-east';
  if (tz?.startsWith('Asia/')) {
    region = 'sg';
  } else if (tz?.startsWith('Australia/')) {
    region = 'au-east';
  } else if (shHistoricalOffset >= 360) {
    // there are a lot of america timezones, so we just check if its mountain time or later
    region = 'us-west';
  }

  debug('cannon repo region is ', region);

  return `https+ipfs://${region}.repo.usecannon.com`;
}
