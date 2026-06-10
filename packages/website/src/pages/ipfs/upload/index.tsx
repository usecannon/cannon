import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Ipfs/Upload');
  },
  {
    ssr: false,
  }
);

export default function IpfsUpload() {
  return (
    <>
      <NoSSR />
    </>
  );
}
