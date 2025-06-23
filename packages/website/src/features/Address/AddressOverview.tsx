import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type AddressOverviewProps = {
  symbol: string | undefined;
  balance: string;
};

const AddressOverview: React.FC<AddressOverviewProps> = ({
  symbol,
  balance,
}) => {
  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <h4 className="text-gray-400">{symbol} BALANCE</h4>
          <div className="flex items-center">
            <span className="text-sm">{balance}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressOverview;
