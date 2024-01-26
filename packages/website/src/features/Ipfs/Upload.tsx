'use client';

import React, { useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useIpfsStore, useStore } from '@/helpers/store';
import {
  Textarea,
  Container,
  Heading,
  Checkbox,
  Button,
  Box,
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
      await add({ id: cid });
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
        <Heading paddingBottom="4" size="md" mb="4">
          Upload to IPFS
        </Heading>
        <Editor
          height="250px"
          theme="vs-dark"
          defaultLanguage="json"
          defaultValue="Enter file content..."
          value={ipfsState.content}
          onChange={(value) => setState(ipfsState, { content: value })}
        />
        <Checkbox
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
          variant="outline"
          colorScheme="black"
          _hover={{
            background: 'gray.800',
          }}
          background="gray.900"
          borderColor="gray.500"
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
