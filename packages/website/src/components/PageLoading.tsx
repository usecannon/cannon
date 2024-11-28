import { CustomSpinner } from '@/components/CustomSpinner';

export default function PageLoading() {
  return (
    <div className="h-screen flex items-center justify-center">
      <CustomSpinner />
    </div>
  );
}
