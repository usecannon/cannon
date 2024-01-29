'use client';

import NextLink from 'next/link';
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useIpfsStore, useStore } from '@/helpers/store';
import {
  Container,
  Link,
  Heading,
  Checkbox,
  Button,
  Box,
  Text,
} from '@chakra-ui/react';
import { writeIpfs } from '@/hooks/ipfs';
import { useItemsList, ItemBase } from '@/helpers/db';
import { History } from './History';

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
    <Container maxW="container.md" py={{ base: 8, md: 12 }}>
      <Box
        p={6}
        mb="4"
        bg="gray.800"
        display="block"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="gray.600"
        borderRadius="4px"
      >
        <Heading paddingBottom="4" size="md" mb="1">
          Upload to IPFS
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

        <Editor
          height="250px"
          theme="vs-dark"
          defaultLanguage="json"
          defaultValue="Enter file content..."
          value={ipfsState.content}
          onChange={(value) => setState(ipfsState, { content: value })}
        />
        <Checkbox
          mt="2"
          mb="6"
          defaultChecked={ipfsState.compression}
          onChange={() =>
            setState(ipfsState, {
              cid: '',
              compression: !ipfsState.compression,
            })
          }
        >
          Compress (zlib)
        </Checkbox>
        <Button
          width="100%"
          colorScheme="teal"
          isLoading={uploading}
          disabled={
            !ipfsApiUrl || !ipfsState.content || uploading || !!ipfsState.cid
          }
          onClick={upload}
        >
          Upload
        </Button>
      </Box>

      {!!items.length && <History items={items} />}
    </Container>
  );
}
