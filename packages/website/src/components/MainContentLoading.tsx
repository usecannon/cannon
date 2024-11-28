import { CustomSpinner } from '@/components/CustomSpinner';

export default function MainContentLoading({
  hasSubheader,
}: {
  hasSubheader?: boolean;
}) {
  return (
    <div
      className={`relative flex justify-center items-center min-h-[calc(100vh-var(--header-height)-${
        hasSubheader ? 'var(--subheader-height)' : '0'
      })]`}
    >
      <CustomSpinner />
    </div>
  );
}
