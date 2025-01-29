import { Alert } from '@/components/ui/alert';
import { useCannonWriteDeployToIpfs } from '@/hooks/cannon';
import { FC } from 'react';

interface WriteToIpfsStatusProps {
  writeToIpfsMutation: ReturnType<typeof useCannonWriteDeployToIpfs>;
}

// Component to display IPFS upload status and errors
const WriteToIpfsStatus: FC<WriteToIpfsStatusProps> = ({
  writeToIpfsMutation,
}) => {
  if (!writeToIpfsMutation) return null;

  return (
    <>
      {writeToIpfsMutation.isPending && (
        <Alert className="mt-6" variant="info">
          <strong>Uploading build result to IPFS...</strong>
        </Alert>
      )}

      {writeToIpfsMutation.error && (
        <p className="text-red-500">
          Failed to upload staged transaction to IPFS:{' '}
          {writeToIpfsMutation.error.toString()}
        </p>
      )}
    </>
  );
};

export default WriteToIpfsStatus;
