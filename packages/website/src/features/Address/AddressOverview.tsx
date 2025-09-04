import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createPublicClient, http } from 'viem';
import { convertToFormatEther } from '@/lib/transaction';
import { Chain } from '@/types/Chain';

type AddressOverviewProps = {
  chain: Chain;
  address: string | undefined;
};

const AddressOverview: React.FC<AddressOverviewProps> = ({
  chain,
  address,
}) => {
  const [balance, setBalance] = useState<string>('');
  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const estimatedBalance = await publicClient.getBalance({
          address: address!,
        });
        setBalance(
          convertToFormatEther(estimatedBalance, chain?.nativeCurrency.symbol)
        );
      } catch (error) {
        console.error('getBalance error:', error);
      }
    };

    fetchBalance();
  }, [address]);

  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <h4 className="text-gray-400">
            {chain?.nativeCurrency.symbol} BALANCE
          </h4>
          <div className="flex items-center">
            <span className="text-sm font-mono">{balance}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressOverview;
