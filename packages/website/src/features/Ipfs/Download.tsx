'use client';

import React, { useEffect, useState } from 'react';
import { Checkbox, Container, FormControl, FormLabel, Input, InputGroup, InputLeftAddon, InputLeftElement, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Download() {
  const [cid, setCid] = useState('');
  const [decompress, setDecompress] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if the router is ready and query parameters are available
    if (router.isReady) {
      const cidParam = router.query.cid;
      if (typeof cidParam === 'string') {
        setCid(cidParam);
      }
    }
  }, [router.isReady, router.query.cid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCid = e.target.value;
    setCid(newCid);

    // Update the URL with the new cid
    router.push({
      pathname: router.pathname,
      query: { ...router.query, cid: newCid },
    }, undefined, { shallow: true });
  };
  
  return (
    <Container maxW='container.md' py={{base:8,md:12}}>

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
            placeholder='Enter CID here'
            value={cid}
            onChange={(e) => setCid(e.target.value)}
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

    </Container>
  );
};
