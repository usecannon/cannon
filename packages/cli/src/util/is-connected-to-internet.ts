import { resolve as dnsResolve } from 'dns';

let isConnectedToInternetCache: boolean | undefined;
export async function isConnectedToInternet() {
  if (isConnectedToInternetCache !== undefined) {
    return isConnectedToInternetCache;
  }
  return new Promise((resolve) => {
    dnsResolve('www.google.com', (error) => {
      if (error) {
        isConnectedToInternetCache = false;
        resolve(false); // No connection
      } else {
        isConnectedToInternetCache = true;
        resolve(true); // Connected
      }
    });
  });
}
