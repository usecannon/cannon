import { QueueFromGitOpsPage } from '@/features/Deploy/QueueFromGitOpsPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Queue From GitOps',
};

export default function Home() {
  return <QueueFromGitOpsPage />;
}
