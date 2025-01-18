import NextLink from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PrevDeploymentStatus({
  prevDeployLocation,
  tomlRequiresPrevPackage,
}: {
  prevDeployLocation: string;
  tomlRequiresPrevPackage?: boolean;
}) {
  return (
    <div className="flex flex-col mb-4">
      {prevDeployLocation ? (
        <Alert variant="info">
          <AlertDescription>
            Previous Deployment:{' '}
            <NextLink
              href={`/ipfs?cid=${prevDeployLocation.replace(
                'ipfs://',
                ''
              )}&compressed=true`}
              className="text-primary hover:underline"
              target="_blank"
            >
              {prevDeployLocation.replace('ipfs://', '')}
            </NextLink>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="info">
          <AlertDescription>
            {tomlRequiresPrevPackage
              ? 'We couldn\'t find a previous deployment for your cannonfile. Please, enter a value in the "Previous Package" input or modify your cannonfile to include a "deployers" key.'
              : 'Deployment from scratch'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
