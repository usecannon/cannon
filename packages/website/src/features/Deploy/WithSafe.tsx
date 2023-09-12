import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { SafeAddressInput } from './SafeAddressInput';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);

  return (
    <>
      <SafeAddressInput />
      {currentSafe && children}
    </>
  );
}
