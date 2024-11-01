import { FC, JSX, PropsWithChildren } from 'react';
import { Card } from '@/components/ui/card';

export const ItemBodyWrapper: FC<
  PropsWithChildren & { titleText: string; titleAction: JSX.Element }
> = ({ children, titleAction, titleText }) => (
  <Card className="bg-gray-800 border-gray-700 p-5">
    <div className="mb-3 flex flex-col md:flex-row md:items-center justify-center">
      <h3 className="text-sm font-semibold mb-2.5 md:mb-0">{titleText}</h3>

      <div className="md:ml-auto">{titleAction}</div>
    </div>

    {children}
  </Card>
);
