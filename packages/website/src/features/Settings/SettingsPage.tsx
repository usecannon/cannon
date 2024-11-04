'use client';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import CustomProviders from '@/features/Settings/CustomProviders';
import SafeTransactionService from '@/features/Settings/SafeTransactionService';
import { initialState, useStore } from '@/helpers/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { badgeVariants } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="container.md mx-auto max-w-screen-md py-12 px-6">
      <h1 className="scroll-m-20 text-3xl font-bold tracking-tight mb-6">
        Settings
      </h1>

      <Card className="mb-6 border-border">
        <CardHeader>
          <CardTitle>Custom Providers</CardTitle>
          <CardDescription>
            Cannon will use custom providers (which may include{' '}
            <Link href="https://www.alchemy.com/">Alchemy</Link> or{' '}
            <Link href="https://www.infura.io/">Infura</Link> endpoints) added
            below if available for the target chain. Otherwise, it will use a{' '}
            <Link href="https://github.com/wevm/viem/tree/main/src/chains/definitions">
              default RPC url
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomProviders />
        </CardContent>
      </Card>

      <Card className="mb-6 border-border">
        <CardHeader>
          <CardTitle>Oracle Multicalls</CardTitle>
          <CardDescription>
            Cannon implements{' '}
            <a
              href="https://eips.ethereum.org/EIPS/eip-7412"
              className="underline"
              target="_blank"
            >
              ERC-7412
            </a>{' '}
            to automatically compose transactions that require oracle data and
            fees. This is primarily used in the Interact tabs in the{' '}
            <NextLink href="/search" className="underline">
              package explorer
            </NextLink>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-400 px-0 pb-2 border-gray-500">
                  Oracle ID
                </TableHead>
                <TableHead className="text-gray-400 px-0 pb-2 border-gray-500">
                  Settings
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-0 border-gray-500">
                  <code className="text-lg">PYTH</code>
                </TableCell>
                <TableCell className="px-0 border-gray-500">
                  <div className="space-y-2">
                    <Label htmlFor="pyth">Price Service Endpoint</Label>
                    <Input
                      id="pyth"
                      className="bg-black border-gray-600"
                      type="text"
                      name="pyth"
                      value={settings.pythUrl}
                      onChange={(evt) =>
                        setSettings({ pythUrl: evt.target.value })
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border">
        <CardHeader>
          <CardTitle>IPFS</CardTitle>
          <CardDescription>
            Cannon connects to a{' '}
            <a
              href="https://docs.ipfs.tech/reference/kubo/rpc/"
              className="underline"
              target="_blank"
            >
              Kubo RPC API URL
            </a>{' '}
            to download and publish packages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <Label htmlFor="ipfs">Kubo RPC API URL</Label>
            <Input
              id="ipfs"
              className="bg-black border-gray-600"
              value={settings.ipfsApiUrl}
              type="text"
              name="ipfsApiUrl"
              onChange={async (evt) => {
                setSettings({ ipfsApiUrl: evt.target.value });
              }}
            />
          </div>
          {settings.ipfsApiUrl.length ? (
            <Link
              href={links.IPFS_DOWNLOAD}
              className={badgeVariants({ variant: 'secondary' })}
            >
              Test IPFS Endpoint
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-6 border-border">
        <CardHeader>
          <CardTitle>Safe Transaction Service</CardTitle>
          <CardDescription>
            The Safe Transaction Services stores signatures for pending
            transactions using the web deployer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeTransactionService />
        </CardContent>
      </Card>

      <div className="my-10 flex gap-4">
        <Alert className="flex-1">
          <div className="flex gap-2">
            <InfoCircledIcon />
            <AlertTitle>
              Changes to settings automatically persist in your web browser.
            </AlertTitle>
          </div>
        </Alert>
        <Button
          variant="destructive"
          onClick={(e) => {
            e.preventDefault();
            if (
              window.confirm(
                "Are you sure you want to reset to default settings? This can't be undone."
              )
            ) {
              setSettings(initialState.settings);
              alert('Done!');
            }
          }}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
