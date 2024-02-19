import * as git from '@/helpers/git';
import { useQuery } from '@tanstack/react-query';
import { createTwoFilesPatch } from 'diff';
import { listServerRefs, ServerRef } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { useMemo } from 'react';

export function useGitRefsList(url: string) {
  const refsQuery = useQuery({
    queryKey: ['git', 'ls-remote', url],
    queryFn: async () => {
      if (url) {
        return listServerRefs({
          http,
          corsProxy: 'https://git-proxy.repo.usecannon.com',
          url,
          protocolVersion: 1, // reccomended when not filtering prefix
        });
      }

      return [];
    },
  });

  return {
    refsQuery,
    refs: refsQuery.data as ServerRef[],
  };
}

export function useGitFilesList(url: string, ref: string, path: string) {
  const gitRepoQuery = useGitRepo(url, ref, []);

  const readdirQuery = useQuery({
    queryKey: ['git', 'readdir', url, ref, path],
    queryFn: async () => {
      return git.readDir(url, ref, path);
    },
    enabled: gitRepoQuery.isSuccess,
  });

  return {
    gitRepoQuery,
    readdirQuery,
    contents: readdirQuery.data,
  };
}

// Initialize or fetch && pull a git repository
export function useGitRepo(url: string, ref: string, files: string[]) {
  const query = useQuery({
    queryKey: ['git', 'clone', url, ref, files],
    queryFn: async () => {
      await git.init(url, ref);
      const fileContents = [];
      for (const file of files) {
        try {
          fileContents.push(await git.readFile(url, ref, file));
        } catch (e) {
          fileContents.push('');
        }
      }

      return fileContents;
    },
    enabled: !!(url && ref),
  });

  return query;
}

/**
 * Generates a unified diff of the specified files
 * @param url the git repository to generate the diff from
 * @param fromRef the branch or git commit has the diff starts from
 * @param toRef the branch or git commit hash the diff ends at
 * @param files the files to be includedi n the diff (files not part of this array are not included)
 */
export function useGitDiff(url: string, fromRef: string, toRef: string, files: string[]) {
  const fromQuery = useGitRepo(url, fromRef, files);
  const toQuery = useGitRepo(url, toRef, files);

  const patches = useMemo(() => {
    const patches: string[] = [];

    if (!fromQuery.data || !toQuery.data) return patches;

    const fromFiles = fromQuery.data;
    const toFiles = toQuery.data;

    for (let i = 0; i < fromFiles.length; i++) {
      if (fromFiles[i] === toFiles[i]) continue;
      const p = createTwoFilesPatch(`a/${files[i]}`, `b/${files[i]}`, fromFiles[i], toFiles[i], undefined, undefined, {
        ignoreWhitespace: false,
      });
      patches.push(p.slice(p.indexOf('\n')));
    }

    return patches;
  }, [fromQuery.status, toQuery.status]);

  return {
    patches,
    fromQuery,
    toQuery,
  };
}
