import { Alert, AlertDescription } from '@/components/ui/alert';

export function PackageErrors({ error }: { error?: string }) {
  return error == null ? null : (
    <Alert className="mb-4" variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
