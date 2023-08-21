import { FC } from 'react';
import { IContentList } from '@/helpers/markdown';
import { Box, Link } from '@chakra-ui/react';

interface ISidebarProps {
  list: IContentList;
}

export const DocsSidebar: FC<ISidebarProps> = ({ list }) => {
  const item = Object.entries(list);
  return (
    <div>
      {item.map((m, idx) => {
        return (
          <div key={idx}>
            <Link
              key={idx}
              textDecoration="none"
              textTransform="uppercase"
              _hover={{ textDecoration: 'none' }}
              href={`#${m[0].toLowerCase().replace(' ', '-')}`}
              display="block"
              fontSize={14}
              mb={6}
              fontFamily="var(--font-miriam)"
            >
              {m[0]}
            </Link>
            <Box mb={6}>
              {m[1].map((s, idx) => {
                return (
                  <Link
                    key={idx}
                    textDecoration="none"
                    textTransform="uppercase"
                    _hover={{ textDecoration: 'none' }}
                    href={`#${s.toLowerCase().replace(' ', '-')}`}
                    display="block"
                    fontSize={14}
                    ml={4}
                    my={2}
                    fontFamily="var(--font-miriam)"
                  >
                    {s}
                  </Link>
                );
              })}
            </Box>
          </div>
        );
      })}
    </div>
  );
};
