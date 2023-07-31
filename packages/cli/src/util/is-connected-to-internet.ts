import { resolve as dnsResolve } from 'dns';

export async function isConnectedToInternet() {
  return new Promise((resolve) => {
    dnsResolve('www.google.com', (error) => {
      if (error) {
        resolve(false); // No connection
      } else {
        resolve(true); // Connected
      }
    });
  });
}
