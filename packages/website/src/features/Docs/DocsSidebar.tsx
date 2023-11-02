import { FC } from 'react';
import { IContentList } from '@/helpers/markdown';
import { Box, Heading, Link } from '@chakra-ui/react';

interface ISidebarProps {
  list: IContentList;
}

export const DocsSidebar: FC<ISidebarProps> = ({ list }) => {
  const item = Object.entries(list);
  return (
    <Box my={4}>
      {item.map((m, idx) => {
        return (
          <div key={idx}>
            <Heading
              fontWeight="500"
              size="sm"
              color="gray.200"
              letterSpacing="0.1px"
              px="2"
              mb="1.5"
            >
              {m[0]}
            </Heading>
            <Box mb={6}>
              {m[1].map((s, idx) => {
                return (
                  <Link
                    key={idx}
                    display="block"
                    textDecoration="none"
                    borderRadius="md"
                    mb={0.5}
                    py={0.5}
                    px="2"
                    cursor="pointer"
                    fontSize="sm"
                    _hover={{ background: 'gray.800' }}
                    href={`#${s
                      .toLowerCase()
                      .replaceAll('?', '')
                      .replaceAll(' ', '-')}`}
                  >
                    {s}
                  </Link>
                );
              })}
            </Box>
          </div>
        );
      })}
    </Box>
  );
};
