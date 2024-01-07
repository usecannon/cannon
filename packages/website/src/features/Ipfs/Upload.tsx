'use client';

import React from 'react';
import { Box, Container, Heading, VStack } from '@chakra-ui/react';

export default function Upload() {

  const { add } = useItemsList<HistoryItem>('upload-history')
  const state = useStore()
  const { set, download } = useActions()

  const [uploading, setUploading] = useState(false)

  async function upload() {
    if (uploading) return
    setUploading(true)

    try {
      const cid = await writeIpfs(state.ipfsApi, state.content, {
        compress: state.compression,
      })
      await add({ id: cid })
      set({ cid })
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <Container maxW='container.md' py={{base:8,md:12}}>

      <Heading size="md">Upload to IPFS</Heading>

      IPFS Endpoint with edit

      <Textarea
        name="content"
        value={state.content}
        label="File Content"
        placeholder="Enter file content..."
        onChange={(content) => set({ cid: '', content })}
        required
      />

      <Checkbox
        defaultChecked={state.compression}
        onChange={(evt) => set({ cid: '', compression: evt.target.checked })}
      >
        Compress (zlib)
      </Checkbox>

      <Button
        width="100%"
        isLoading={uploading}
        disabled={!state.ipfsApi || !state.content || uploading || !!state.cid}
        onClick={upload}
      >
        Upload
      </Button>

      Previously uploaded files
      
      </Container>
  );
};
