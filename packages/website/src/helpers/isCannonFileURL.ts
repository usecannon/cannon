const cannonfileUrlRegex =
  // eslint-disable-next-line no-useless-escape
  /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?\.toml$/i;

export const isCannonFileURL = (url: string) => {
  return cannonfileUrlRegex.test(url);
};
