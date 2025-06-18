import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MoveUpRight } from 'lucide-react';
import Link from 'next/link';
import { ClipboardButton } from '@/components/ClipboardButton';

type AddressMoreInfoProps = {
  chainId: number | undefined;
};

const AddressMoreInfo: React.FC<AddressMoreInfoProps> = ({ chainId }) => {
  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>More Info</CardTitle>
        </CardHeader>
        <CardContent>
          <h5 className="text-gray-500">TRANSACNS SENT</h5>
          <div className="flex items-center mb-4">
            <span className="text-gray-400 mr-2">Latest:</span>
            <Link
              href={`/tx/${chainId}/${'0xd29520ba19d0b2b85ce81effdcd493a7a3ee5f3d2ed5ab28dd2a14fef130c2f4'}`}
              className="flex items-center border-b border-dotted border-muted-foreground "
            >
              <span className="mr-1">16 secs ago</span>
              <MoveUpRight className="h-4 w-4" />
            </Link>
            <span className="text-gray-400 ml-4 mr-2">First:</span>
            <Link
              href={`/tx/${chainId}/${'0xd29520ba19d0b2b85ce81effdcd493a7a3ee5f3d2ed5ab28dd2a14fef130c2f4'}`}
              className="flex items-center border-b border-dotted border-muted-foreground "
            >
              <span className="mr-1">2 years ago</span>
              <MoveUpRight className="h-4 w-4" />
            </Link>
          </div>
          <h5 className="text-gray-500">FUNDED BY</h5>
          <div className="flex items-center mb-4">
            <span className="mr-2">0x74595803...39cc887b7</span>
            <ClipboardButton text="0x74595803...39cc887b7" />
            <span className="mx-2 text-gray-400">|</span>
            <Link
              href={`/tx/${chainId}/${'0xd29520ba19d0b2b85ce81effdcd493a7a3ee5f3d2ed5ab28dd2a14fef130c2f4'}`}
              className="flex items-center border-b border-dotted border-muted-foreground "
            >
              <span className="mr-1">108 days ago</span>
            </Link>
          </div>
          <h5 className="text-gray-500">Contract Creator</h5>
          <div className="flex items-center">
            <span className="mr-2">0x74595803...39cc887b7</span>
            <ClipboardButton text="0x74595803...39cc887b7" />
            <span className="mx-2 text-gray-400">|</span>
            <Link
              href={`/tx/${chainId}/${'0xd29520ba19d0b2b85ce81effdcd493a7a3ee5f3d2ed5ab28dd2a14fef130c2f4'}`}
              className="flex items-center border-b border-dotted border-muted-foreground "
            >
              <span className="mr-1">12 days ago</span>
              <MoveUpRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressMoreInfo;
