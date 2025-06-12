import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const AddressMultiChain = () => {
  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>Multichain Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center">
            <span className="text-gray-400 text-sm mr-2">Contracts:</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressMultiChain;
