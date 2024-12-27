import { CustomSpinner } from '@/components/CustomSpinner';

/* {
  hasSubheader,
}: {
  hasSubheader?: boolean;
} */

export default function MainContentLoading() {
  return (
    <div className={'h-screen w-screen flex justify-center items-center'}>
      <CustomSpinner />
    </div>
  );
}
