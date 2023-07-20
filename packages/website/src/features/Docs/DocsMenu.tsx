import { FC } from 'react';
import { IContentList } from '@/helpers/markdown';
import { Link } from '@chakra-ui/react';

interface IMenuProps {
  list: IContentList;
}

export const DocsMenu: FC<IMenuProps> = ({ list }) => {
  const item = Object.entries(list);
  console.log('item', item);
  return (
    <div>
      {item.map((m, idx) => {
        console.log('m', m);
        return (
          <Link
            key={idx}
            textDecoration="none"
            textTransform="uppercase"
            _hover={{ textDecoration: 'none' }}
            href={`#${m[0]}`}
            display="block"
            fontSize={14}
            my={6}
          >
            {m[0]}
          </Link>
        );
      })}
    </div>
  );
};
