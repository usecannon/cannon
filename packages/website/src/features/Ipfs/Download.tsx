'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryIpfsDataRaw } from '@/hooks/ipfs';
import { CodePreview } from '@/components/CodePreview';
import { useStore } from '@/helpers/store';
import { Download as DownloadIcon } from 'lucide-react';
import {
  arrayBufferToUtf8,
  decodeData,
  decompressData,
  Encodings,
  EncodingsKeys,
} from '@/helpers/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IpfsSpinner } from '@/components/IpfsSpinner';

function parseJson(data: ArrayBuffer | undefined, decompress?: boolean) {
  if (!data || decompress === undefined) return false;
  let _data;
  if (decompress) {
    try {
      _data = decompressData(data) as string;
    } catch (error) {
      _data = JSON.stringify({
        error: 'Failed trying to decompress data.',
        try: 'Disabling compression.',
      });
    }
  } else {
    _data = arrayBufferToUtf8(data);
  }

  try {
    return JSON.parse(_data);
  } catch (e) {
    return null;
  }
}

export default function Download() {
  const [cid, setCid] = useState('');
  const [decompress, setDecompress] = useState<boolean | undefined>();
  const router = useRouter();
  const pathname = router.pathname;
  const searchParams = router.query;
  const ipfsApiUrl = useStore((s) => s.settings.ipfsApiUrl);
  const [encoding, setEncoding] = useState<EncodingsKeys>('utf8');

  useEffect(() => {
    const queryCid = searchParams.cid;

    if (queryCid && typeof queryCid === 'string') {
      setCid(queryCid);
    }
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(router.query).length && decompress === undefined) {
      setDecompress(router.query.compressed !== 'false');
    }
  }, [router]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const current = new URLSearchParams(
      Array.from(Object.entries(searchParams)) as any
    );

    const value = e.target.value.trim();

    if (!value) {
      current.delete('cid');
    } else {
      current.set('cid', e.target.value);
    }

    const search = current.toString();
    const query = search ? `?${search}` : '';

    await router.push(`${pathname}${query}`);
  };

  const handleEncodingChange = (e: {
    target: { value: React.SetStateAction<string> };
  }) => {
    setEncoding(e.target.value as EncodingsKeys);
  };

  const handleSwitchDecompress = async (e: ChangeEvent<HTMLInputElement>) => {
    setDecompress(e.target.checked);

    const newQuery = {
      ...router.query,
      compressed: e.target.checked.toString(),
    };
    await router.replace(
      {
        pathname: router.pathname,
        query: newQuery,
      },
      undefined,
      { shallow: true }
    );
  };

  const { data: ipfsData } = useQueryIpfsDataRaw(cid, true);
  const parsedJsonData = parseJson(ipfsData, decompress);
  const isJson = parsedJsonData !== null;
  const decodedData = isJson
    ? JSON.stringify(parsedJsonData, null, 2)
    : decompress
    ? JSON.stringify({
        error: 'Compression is not enabled for non JSON files.',
        try: 'Disabling compression.',
      })
    : decodeData(ipfsData as ArrayBuffer, encoding);

  const handleDownload = () => {
    if (!decodedData) return;

    const blob = new Blob([decodedData], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = cid + (isJson ? '.json' : '.txt');
    document.body.appendChild(anchor);
    anchor.click();

    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 md:py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Download from IPFS</CardTitle>
        </CardHeader>
        <CardContent>
          {ipfsApiUrl?.length && (
            <>
              <div className="mb-4">
                <label htmlFor="cid" className="block text-sm mb-1">
                  CID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    ipfs://
                  </span>
                  <input
                    className="w-full pl-16 bg-black border border-white/40 rounded-md h-10 px-3"
                    placeholder="Qm..."
                    id="cid"
                    value={cid}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {cid && !ipfsData && (
                <div className="py-20">
                  <IpfsSpinner ipfsUrl={`ipfs://${cid}`} />
                </div>
              )}

              {ipfsData && (
                <div>
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="decompress"
                      checked={decompress}
                      onChange={handleSwitchDecompress}
                      className="mr-2"
                    />
                    <label htmlFor="decompress">Decompress using zlib</label>
                  </div>

                  <div className="mb-8">
                    <label className="block text-sm mb-1">Decode</label>
                    <select
                      value={encoding}
                      onChange={handleEncodingChange}
                      className="w-full h-10 px-3 rounded-md border border-gray-600 bg-black mb-2"
                    >
                      {Object.entries(Encodings).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4 min-h-[420px]">
                    <CodePreview
                      code={String(decodedData)}
                      language={isJson ? 'json' : undefined}
                      height="420px"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded hover:bg-gray-700"
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
