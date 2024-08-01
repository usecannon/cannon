'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import {
  Checkbox,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Text,
  Box,
  Link,
  Button,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useQueryIpfsDataRaw } from '@/hooks/ipfs';
import { CodePreview } from '@/components/CodePreview';
import { useStore } from '@/helpers/store';
import { DownloadIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import {
  arrayBufferToUtf8,
  decodeData,
  decompressData,
  Encodings,
  EncodingsKeys,
} from '@/helpers/misc';

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
    <Container maxW="container.md" py={{ base: 8, md: 12 }}>
      <Box
        p={6}
        bg="gray.800"
        display="block"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="gray.600"
        borderRadius="4px"
      >
        <Heading paddingBottom="4" size="md" mb="1">
          Download from IPFS
        </Heading>

        <Text mb={4}>
          <Text>
            Update your IPFS URL in{' '}
            <Link as={NextLink} href="/settings">
              settings
            </Link>
            .
          </Text>
        </Text>

        {ipfsApiUrl?.length && (
          <>
            <FormControl mb={3}>
              <FormLabel htmlFor="cid" mb={1}>
                CID
              </FormLabel>
              <InputGroup size="md">
                <InputLeftElement pointerEvents="none" pl={8} color="gray.400">
                  <span>ipfs://</span>
                </InputLeftElement>
                <Input
                  pl={16}
                  placeholder="Qm..."
                  bg="black"
                  borderColor="whiteAlpha.400"
                  id="cid"
                  value={cid}
                  onChange={handleInputChange}
                />
              </InputGroup>
            </FormControl>
            <Checkbox
              mb={2}
              isChecked={decompress}
              onChange={handleSwitchDecompress}
            >
              Decompress using zlib
            </Checkbox>
            {ipfsData && (
              <Box>
                <FormControl mb={8}>
                  <FormLabel mb={1}>Decode</FormLabel>
                  <Select
                    value={encoding}
                    onChange={handleEncodingChange}
                    mb={2}
                  >
                    {Object.entries(Encodings).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <Box mb={4} minHeight="420px">
                  <CodePreview
                    code={String(decodedData)}
                    language={isJson ? 'json' : undefined}
                    height="420px"
                  />
                </Box>
                <Box>
                  <Button
                    variant="outline"
                    colorScheme="white"
                    size="xs"
                    color="gray.300"
                    borderColor="gray.500"
                    _hover={{ bg: 'gray.700' }}
                    leftIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    ml="auto"
                  >
                    Download
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
