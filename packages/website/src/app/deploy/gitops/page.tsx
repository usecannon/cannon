import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/QueueFromGitOpsPage');
  },
  {
    ssr: false,
  }
);

export const metadata: Metadata = {
  title: 'Cannon | Queue From GitOps',
  description: 'Queue From GitOps',
  openGraph: {
    title: 'Cannon | Queue From GitOps',
    description: 'Queue From GitOps',
  },
};

export default function QueueFromGitOps() {
  return <NoSSR />;
}
