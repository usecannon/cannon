import { GetPackagesQuery } from '@/types/graphql/graphql';
import { FC, useEffect, useMemo } from 'react';
import _ from 'lodash';
import chainsData from '@/constants/chainsData';
import { FormControl, Select } from '@chakra-ui/react';

type Package = GetPackagesQuery['packages'][0];
export type VersionInfo = {
  name: string;
  tag: string;
  preset: string;
  chain_id: number;
  ipfs: string;
  last_updated: any;
};

export const VersionSelect: FC<{
  pkg: Package;
  onChange: (value: VersionInfo) => void;
}> = ({ pkg, onChange }) => {
  const options = useMemo(() => {
    return _.flatten(
      pkg.tags.map((t) => {
        const _variants = [...(t.variants || [])];
        return (
          _variants
            .sort((a, b) => (a.chain_id > b.chain_id ? 1 : -1))
            .map((v) => {
              return {
                name: `${t.name} on ${chainsData[v.chain_id].name}${
                  v.preset !== 'main' ? ' (' + v.preset + ')' : ''
                }`,
                tag: t.name,
                preset: v.preset,
                chain_id: v.chain_id,
                ipfs: v.deploy_url,
                last_updated: v.last_updated,
              };
            }) || []
        );
      })
    );
  }, [pkg]);
  useEffect(() => {
    onChange(options[0]);
  }, [options]);
  return (
    <FormControl>
      <Select
        id="version-select"
        bg="black"
        borderColor="whiteAlpha.400"
        onChange={(e) => {
          onChange(JSON.parse(e.target.value));
        }}
      >
        {options.map((option) => {
          return (
            <option
              style={{ backgroundColor: 'black' }}
              value={JSON.stringify(option)}
              key={JSON.stringify(option)}
            >
              {option.name}
            </option>
          );
        })}
      </Select>
    </FormControl>
  );
};
