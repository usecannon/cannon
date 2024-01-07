'use client';

import React, { useEffect, useState } from 'react';
import { Checkbox, Container, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftElement, VStack, Text } from '@chakra-ui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { CodePreview } from '@/components/CodePreview';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
      const queryCid = searchParams.get('cid');
      if (queryCid && typeof queryCid === 'string') {
        setCid(queryCid);
      }
    
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries())); // -> has to use this form

    const value = e.target.value.trim();

    if (!value) {
      current.delete("cid");
    } else {
      current.set("cid", e.target.value);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
    setCid(value);
  };

  const { data: display } = useQueryIpfsData(cid,true,!decompress);
  const isJson = isJsonParsable(display)

  console.log(display, isJson)

  return (
    <Container maxW='container.md' py={{base:8,md:12}}>

      <Heading size="md">Download from IPFS</Heading>

      IPFS Endpoint with edit

      <VStack spacing={4}>
        <FormControl>
          <FormLabel htmlFor='cid'>CID</FormLabel>
          <InputGroup>
            <InputLeftElement
              pointerEvents='none'
              color='gray.500'
              fontSize='1em'
              children='ipfs://'
            />
            <Input
              id='cid'
              value={cid}
              onChange={handleInputChange}
            />
          </InputGroup>
        </FormControl>
        <Checkbox
          isChecked={decompress}
          onChange={(e) => setDecompress(e.target.checked)}
        >
          Decompress using zlib
        </Checkbox>
      </VStack>
      {JSON.stringify(display)}
        { false && display && <CodePreview code={display} language={isJson ? 'json' : undefined} />}
    </Container>
  );
};
