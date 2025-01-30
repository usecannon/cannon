import React from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NextLink from 'next/link';
import { ChainDefinition } from '@usecannon/builder';

interface IpfsGatewayAlertProps {
  isIpfsGateway: boolean;
  cannonDef?: ChainDefinition;
}

export function IpfsGatewayAlert({
  isIpfsGateway,
  cannonDef,
}: IpfsGatewayAlertProps) {
  if (isIpfsGateway) {
    return (
      <Alert variant="destructive">
        <Cross2Icon className="h-4 w-4 mr-3" />
        <AlertDescription>
          Your current IPFS URL is set to a gateway. Update your IPFS URL to an
          API endpoint where you can pin files in{' '}
          <NextLink href="/settings" className="text-primary hover:underline">
            settings
          </NextLink>
          .
        </AlertDescription>
      </Alert>
    );
  }

  if (
    cannonDef?.danglingDependencies &&
    cannonDef.danglingDependencies.size > 0
  ) {
    return (
      <Alert variant="destructive">
        <Cross2Icon className="h-4 w-4 mr-3" />
        <AlertDescription>
          <div className="flex flex-col">
            <p>
              The cannonfile contains invalid dependencies. Please ensure the
              following references are defined:
            </p>
            <div>
              {Array.from(cannonDef.danglingDependencies).map((dependency) => (
                <React.Fragment key={dependency}>
                  <span className="font-mono">{dependency}</span>
                  <br />
                </React.Fragment>
              ))}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
