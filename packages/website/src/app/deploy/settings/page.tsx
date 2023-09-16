import { Metadata } from 'next';
import { SettingsPage } from '@/features/Settings/SettingsPage';

export const metadata: Metadata = {
  title: 'Cannon | Settings',
};
export default function Home() {
  return <SettingsPage />;
}
