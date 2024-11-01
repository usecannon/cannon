'use client';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { Alert } from '@/components/Alert';
import CustomProviders from '@/features/Settings/CustomProviders';
import SafeTransactionService from '@/features/Settings/SafeTransactionService';
import { initialState, useStore } from '@/helpers/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="container.md mx-auto max-w-screen-md">
      <div>
        <Alert status="info" className="my-10">
          Changes to settings automatically persist in your web browser.
        </Alert>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Card className="mb-6 border-border">
          <CardHeader>
            <CardTitle>Custom Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomProviders />
          </CardContent>
        </Card>

        <Card className="mb-6 border-border">
          <CardHeader>
            <CardTitle>Ethereum</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-1">Oracle Multicalls</h3>
            <p className="text-sm mb-3">
              Cannon implements{' '}
              <a
                href="https://eips.ethereum.org/EIPS/eip-7412"
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ERC-7412
              </a>{' '}
              to automatically compose transactions that require oracle data and
              fees. This is primarily used in the Interact tabs in the{' '}
              <NextLink
                href="/search"
                className="text-blue-400 hover:underline"
              >
                package explorer
              </NextLink>
              . Multicalls are composed using a{' '}
              <NextLink
                href="/packages/trusted-multicall-forwarder/latest/13370-main"
                className="text-blue-400 hover:underline"
              >
                trusted multicall forwarder
              </NextLink>{' '}
              if integrated with the target protocol.
            </p>

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
          </CardHeader>
          <CardContent>
            <p className="text-md mb-4">
              Enter a{' '}
              <a
                href="https://docs.ipfs.tech/reference/kubo/rpc/"
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kubo RPC API URL
              </a>{' '}
              to download packages and publish them using the deployer.
            </p>
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
              <Button
                variant="outline"
                size="sm"
                className="text-blue-400 border-blue-400 hover:bg-blue-800 no-underline"
                asChild
              >
                <a href={links.IPFS_DOWNLOAD}>Test IPFS Endpoint</a>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mb-6 border-border">
          <CardHeader>Safe Transaction Service</CardHeader>
          <CardContent>
            <SafeTransactionService />
          </CardContent>
        </Card>

        <div className="mb-5 text-right">
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
    </div>
  );
}
