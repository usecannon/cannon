import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BuildStateAlertsProps {
  buildState: any;
  buildStateMessage: string | null;
  buildStateError: string | null;
  deployer: any;
}

export function BuildStateAlerts({
  buildState,
  buildStateMessage,
  buildStateError,
  deployer,
}: BuildStateAlertsProps) {
  return (
    <>
      {buildStateMessage && (
        <Alert variant="info" className="mt-6">
          <AlertDescription className="font-bold">
            {buildStateMessage}
          </AlertDescription>
        </Alert>
      )}
      {buildStateError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription className="font-bold">
            {buildStateError}
          </AlertDescription>
        </Alert>
      )}

      {buildState.skippedSteps.length > 0 && (
        <Alert variant="destructive" className="my-2">
          <div className="space-y-2">
            <p className="font-bold mb-2">
              This safe will not be able to complete the following operations:
            </p>
            <div className="max-h-[300px] overflow-auto">
              {buildState.skippedSteps.map((s: any, i: number) => (
                <p key={i} className="font-mono mb-2">
                  <strong>{`[${s.name}]: `}</strong>
                  {s.name.startsWith('deploy.') ||
                  s.name.startsWith('contract.')
                    ? 'Is not possible to build and deploy a contract from source code from the website. You should first build your cannonfile using the CLI and continue the deployment from a partial build.'
                    : s.err.toString()}
                </p>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {!!buildState.result?.deployerSteps?.length &&
        (buildState.result?.safeSteps.length || 0) > 0 && (
          <div className={cn('mt-6 mb-5 border border-border rounded-md p-4')}>
            {deployer.queuedTransactions.length === 0 ? (
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground">
                  <p>
                    The following steps should be executed outside the safe
                    before staging.
                  </p>
                  {buildState.result?.deployerSteps.map((s: any) => (
                    <p key={s.name} className="ml-2">
                      - {s.name}
                    </p>
                  ))}
                  <p className="mb-4">
                    You can execute these now in your browser. By clicking the
                    button below.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    deployer.queueTransactions(
                      buildState.result!.deployerSteps.map(
                        (s: any) => s.tx as any
                      )
                    )
                  }
                >
                  Execute Outside Safe Txns
                </Button>
              </div>
            ) : deployer.executionProgress.length <
              deployer.queuedTransactions.length ? (
              <p>
                Deploying txns {deployer.executionProgress.length + 1} /{' '}
                {deployer.queuedTransactions.length}
              </p>
            ) : (
              <p>
                All Transactions Queued Successfully. You may now continue the
                safe deployment.
              </p>
            )}
          </div>
        )}
    </>
  );
}
