import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

const AddressNftTransfer = () => {
  return (
    <>
      <Card className="rounded-sm w-full">
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 space-y-3 pt-7">
            <span className="rounded-full border border-gray-400 p-2 bg-gray-700">
              <Inbox className="h-8 w-8 text-white" />
            </span>
            <h1 className="text-lg">Under Construction</h1>
            <span className="text-sm text-gray-400">
              This page is currently under construction.
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressNftTransfer;
