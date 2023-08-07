import { GetPackagesQuery } from '@/types/graphql/graphql';
import { FC } from 'react';
import { Box, Grid, GridItem, Heading } from '@chakra-ui/react';
import PackageNetworks from '@/components/PackageNetworks';
import PublishInfo from '@/features/Search/PackageCard/PublishInfo';
import _ from 'lodash';

type Package = GetPackagesQuery['packages'][0];
type Tag = Package['tags'][0];
type Variant = Tag['variants'][0];

export const Versions: FC<{
  pkg: Package;
}> = ({ pkg }) => {
  const variantsByTag = (tag: Tag): Record<string, Variant[]> => {
    return _.groupBy(tag.variants, 'preset');
  };

  const latestVariantByTag = (tag: Tag): Variant => {
    const a = variantsByTag(tag);
    const array: Variant[] = Object.values(a)[0];
    const result: Variant = array.reduce((max, current) => {
      return current.last_updated > max.last_updated ? current : max;
    }, array[0]);
    return result;
  };

  return (
    <Box>
      {pkg.tags.map((tag) => {
        return (
          <Box pb="3" mb="3" key={tag.id}>
            <Heading mb="3" size="md">
              {tag.name}
            </Heading>
            {Object.values(variantsByTag(tag)).map((variants: Variant[]) => {
              return (
                <Grid
                  pt="2"
                  mb="2"
                  v-for="variants in variantsByTag(tag)"
                  key={variants[0].preset}
                  borderTop="1px solid"
                  borderColor="gray.700"
                  template-columns="repeat(12, 1fr)"
                  gap="2"
                >
                  <GridItem col-span="2" pt="1">
                    <Heading size="sm" my="auto">
                      {variants[0].preset}
                    </Heading>
                  </GridItem>
                  <GridItem col-span="7">
                    <PackageNetworks download p={{ variants }} />
                  </GridItem>
                  <GridItem col-span="3" textAlign="right">
                    <PublishInfo lineBreak={true} p={latestVariantByTag(tag)} />
                  </GridItem>
                </Grid>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};
