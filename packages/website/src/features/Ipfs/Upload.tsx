'use client';

import NextLink from 'next/link';
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useIpfsStore, useStore } from '@/helpers/store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UploadIcon } from '@radix-ui/react-icons';
import { useItemsList, ItemBase } from '@/helpers/db';
import { History } from './History';
import { writeIpfs } from '@/hooks/ipfs';

export default function Upload() {
  const { add, items } = useItemsList<ItemBase>('upload-history');
  const ipfsState = useIpfsStore();
  const ipfsApiUrl = useStore((s) => s.settings.ipfsApiUrl);
  const [uploading, setUploading] = useState(false);

  const { setState } = ipfsState;

  async function upload() {
    if (uploading) return;
    setUploading(true);

    try {
      const cid = await writeIpfs(ipfsApiUrl, ipfsState.content, {
        compress: ipfsState.compression,
      });
      await add({ id: cid, compressed: ipfsState.compression });
      setState(ipfsState, { cid });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container py-8 md:py-12 max-w-3xl mx-auto">
      <Card className="mb-4 bg-gray-800 border-gray-600">
        <CardHeader>
          <h2 className="text-lg font-semibold mb-1">Upload to IPFS</h2>

          <p className="mb-4">
            Update your IPFS URL in{' '}
            <NextLink
              href="/settings"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              settings
            </NextLink>
            .
          </p>
        </CardHeader>

        <CardContent>
          <Editor
            height="250px"
            theme="vs-dark"
            defaultLanguage="json"
            defaultValue="Enter file content..."
            value={ipfsState.content}
            onChange={(value) => setState(ipfsState, { content: value })}
          />

          <div className="mt-2 mb-6 flex items-center space-x-2">
            <Checkbox
              id="compress"
              checked={ipfsState.compression}
              onCheckedChange={() =>
                setState(ipfsState, {
                  cid: '',
                  compression: !ipfsState.compression,
                })
              }
            />
            <label
              htmlFor="compress"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Compress (zlib)
            </label>
          </div>

          <Button
            className="w-full"
            variant="default"
            disabled={
              !ipfsApiUrl || !ipfsState.content || uploading || !!ipfsState.cid
            }
            onClick={upload}
          >
            {uploading ? (
              <>
                <UploadIcon className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {!!items.length && <History items={items} />}
    </div>
  );
}
