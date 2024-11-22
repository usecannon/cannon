import { CustomSpinner } from '@/components/CustomSpinner';

export default function PageLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center">
      <CustomSpinner />
    </div>
  );
}
