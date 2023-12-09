import LightningFS from '@isomorphic-git/lightning-fs';
import md5 from 'crypto-js/md5';
import { checkout, clone, fetch, findRoot } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { memoize } from 'lodash';

const getFs = memoize((name: string) => new LightningFS(name).promises);
const getDir = memoize((repo: string, ref: string) => `/${md5(repo)}-${md5(ref)}`);

export async function init(repo: string, ref: string) {
  const fs = getFs('git-repositories');
  const dir = getDir(repo, ref);

  await _mkdirp(fs, dir);

  const cloned = await _isCloned(fs, dir);

  const baseOpts = {
    fs,
    http,
    dir,
    url: repo,
    ref,
    corsProxy: 'https://git-proxy.repo.usecannon.com',
  };

  if (!cloned) {
    await clone({ ...baseOpts, singleBranch: true, depth: 1 });
  } else {
    await fetch({ ...baseOpts, singleBranch: true, depth: 1 });
    await checkout({ fs, dir, ref });
  }
}

export async function readFile(repo: string, ref: string, filepath: string) {
  const fs = getFs('git-repositories');
  const dir = getDir(repo, ref);
  return (await fs.readFile(`${dir}/${filepath}`, 'utf8')) as string;
}

export async function readDir(repo: string, ref: string, path: string) {
  const fs = getFs('git-repositories');
  const dir = getDir(repo, ref);
  return (await fs.readdir(`${dir}/${path}`)) as string[];
}

async function _mkdirp(fs: any, dir: string) {
  try {
    await fs.mkdir(dir);
  } catch (err: any) {
    if (err.code === 'EEXIST') return;
    throw err;
  }
}

async function _isCloned(fs: any, dir: string) {
  try {
    await findRoot({
      fs,
      filepath: `${dir}/.git`,
    });
    return true;
  } catch (err: any) {
    if (err.code === 'NotFoundError') return false;
    throw err;
  }
}
