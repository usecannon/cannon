'use client';

import React, { useEffect, useState } from 'react';
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
import { useQueryIpfsData } from '@/hooks/ipfs';
import { CodePreview } from '@/components/CodePreview';
import { useStore } from '@/helpers/store';
import { DownloadIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';

function isJsonParsable(string: string): boolean {
  try {
    JSON.parse(string);
    return true;
  } catch (e) {
    return false;
  }
}

export default function Download() {
  const [cid, setCid] = useState('');
  const [decompress, setDecompress] = useState(false);
  const router = useRouter();
  const pathname = router.pathname;
  const searchParams = router.query;
  const ipfsApiUrl = useStore((s) => s.settings.ipfsApiUrl);
  const [encoding, setEncoding] = useState('utf8');

  useEffect(() => {
    const queryCid = searchParams.cid;
    const queryCompressed = searchParams.compressed;

    if (queryCid && typeof queryCid === 'string') {
      setCid(queryCid);
    }

    if (queryCompressed && queryCompressed === 'true') {
      setDecompress(true);
    }
  }, [searchParams]);

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
    setEncoding(e.target.value);
  };

  const decodeData = (data: ArrayBuffer, encoding: string) => {
    try {
      if (encoding === 'base64') {
        return btoa(
          String.fromCharCode.apply(null, Array.from(new Uint8Array(data)))
        );
      } else if (encoding === 'hex') {
        return Array.from(new Uint8Array(data))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } else if (encoding === 'utf8') {
        return new TextDecoder('utf-8').decode(new Uint8Array(data));
      }
      return data;
    } catch (err) {
      return data;
    }
  };

  const { data: ipfsData } = useQueryIpfsData(cid, true, !decompress);

  const decodedData =
    ipfsData instanceof ArrayBuffer
      ? decodeData(ipfsData, encoding)
      : JSON.stringify(ipfsData, null, 2);

  const isJson = isJsonParsable(String(decodedData));

  const handleDownload = () => {
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
              onChange={(e) => setDecompress(e.target.checked)}
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
                    <option value="utf8">UTF-8</option>
                    <option value="base64">Base64</option>
                    <option value="hex">Hexadecimal</option>
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
