import { CustomSpinner } from '@/components/CustomSpinner';

export default function PageLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <CustomSpinner />
    </div>
  );
}
