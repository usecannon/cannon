import { links } from '@/constants/links';
import { CustomSpinner } from './CustomSpinner';
import Link from 'next/link';

interface IpfsSpinnerProps {
  ipfsUrl?: string;
}

export function IpfsSpinner({ ipfsUrl }: IpfsSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <div className="flex items-center justify-center flex-shrink-0">
        <CustomSpinner />
      </div>
      <p className="text-sm mt-5 mb-1 text-gray-400">
        Fetching {ipfsUrl ? ipfsUrl : 'via IPFS'}
      </p>
      <p className="text-gray-500 text-xs">
        This could take a minute. You can also{' '}
        <Link href={links.SETTINGS} className="underline">
          try another IPFS gateway
        </Link>
        .
      </p>
    </div>
  );
}
