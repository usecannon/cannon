import Debug from 'debug';

const debug = Debug('cannon:builder:constants');

export const CANNON_CHAIN_ID = 13370;
export const BUILD_VERSION = 7;

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
