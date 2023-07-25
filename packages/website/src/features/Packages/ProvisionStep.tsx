import { FC, useMemo } from 'react';
import { BundledOutput, ChainArtifacts } from '@usecannon/builder';
import { Box, Flex, Heading, Code, useToast } from '@chakra-ui/react';
import { BundledChainBuilderOutputs } from '@usecannon/builder';
import { Copy } from 'react-feather';

export const ProvisionStep: FC<{
  cannonOutputs: ChainArtifacts | null;
  imports: BundledChainBuilderOutputs;
}> = ({ cannonOutputs, imports }) => {
  const output: {
    title: string;
    url: BundledOutput['url'];
    contracts: BundledOutput['contracts'];
    imports: BundledOutput['imports'];
  }[] = useMemo(() => {
    return (
      Object.entries(imports).map(([k, v]) => {
        return {
          title: k,
          url: v.url,
          contracts: v.contracts,
          imports: v.imports,
        };
      }) || []
    );
  }, [imports]);
  const toast = useToast();

  // TODO: It's a copy of function in PackageNetworks.tsx
  const copy = (textToCopy: string) => {
    toast({
      title: 'Copied to clipboard',
      status: 'info',
      duration: 4000,
    });

    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
      // navigator clipboard api method'
      return navigator.clipboard.writeText(textToCopy);
    } else {
      // text area method
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      // make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise<void>((res, rej) => {
        // here the magic happens
        document.execCommand('copy') ? res() : rej();
        textArea.remove();
      });
    }
  };
  return (
    <Box mb="8">
      {output.map((o) => {
        return (
          <Box key={JSON.stringify(o)}>
            <Flex mb="2">
              <Heading v-if="o.title" mb="1" size="lg" display="inline-block">
                {o.title}
              </Heading>
              <Box ml="auto" v-if="o.url">
                <Code bg="blackAlpha.800" color="whiteAlpha.800">
                  {o.url.replace('ipfs://', '@ipfs:')}
                </Code>
                <div
                  onClick={async () => {
                    await copy(o.url.replace('ipfs://', '@ipfs:'));
                  }}
                  className="copy-button"
                >
                  <Copy />
                </div>
              </Box>
            </Flex>
            {/*<contractStep :contracts="o.contracts" :cannonOutputs="cannonOutputs" />*/}

            {o.imports && (
              <ProvisionStep
                imports={o.imports}
                cannonOutputs={cannonOutputs}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};
