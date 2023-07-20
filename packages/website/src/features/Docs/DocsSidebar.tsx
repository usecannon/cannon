import { FC } from 'react';
import { IContentList } from '@/helpers/markdown';
import { Link } from '@chakra-ui/react';

interface ISidebarProps {
  list: IContentList;
}

export const DocsSidebar: FC<ISidebarProps> = ({ list }) => {
  const item = Object.entries(list);
  console.log('item', item);
  return (
    <div>
      {item.map((m, idx) => {
        console.log('m', m);
        return (
          <>
            <Link
              key={idx}
              textDecoration="none"
              textTransform="uppercase"
              _hover={{ textDecoration: 'none' }}
              href={`#${m[0].toLowerCase().replace(' ', '-')}`}
              display="block"
              fontSize={14}
              my={6}
            >
              {m[0]}
            </Link>
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
                >
                  {s}
                </Link>
              );
            })}
          </>
        );
      })}
    </div>
  );
};
