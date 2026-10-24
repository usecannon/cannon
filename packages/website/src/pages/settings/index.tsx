import dynamic from 'next/dynamic';

const NoSSR = dynamic(() => import('@/features/Settings/SettingsPage'), {
  ssr: false,
});

export default function Settings() {
  return (
    <>
      <NoSSR />
    </>
  );
}
