import { isValidUrl } from '@/helpers/isValidUrl';
import { useStore } from '@/helpers/store';

import { Flex, FormLabel, IconButton, Input, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { Cross2Icon, Pencil1Icon } from '@radix-ui/react-icons';

export default function CustomProviders() {
  const [editProviderIndex, setEditProviderIndex] = useState<
    number | undefined
  >();
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();

  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const inputRef = useRef<HTMLInputElement>(null);

  const addEditProvider = () => {
    if (inputError || !inputValue.trim()) return;

    if (editProviderIndex == undefined) {
      setSettings({
        customProviders: [...settings.customProviders, inputValue],
      });
    } else {
      const updatedProviders = [...settings.customProviders];
      updatedProviders[editProviderIndex] = inputValue;
      setSettings({ customProviders: updatedProviders });
      setEditProviderIndex(undefined);
    }

    setInputValue('');
  };

  const removeProvider = (index: number) => {
    const updatedProviders = [...settings.customProviders];
    updatedProviders.splice(index, 1);
    setSettings({ customProviders: updatedProviders });
  };

  useEffect(() => {
    if (inputValue === '') {
      setInputError(undefined);
    } else if (!isValidUrl(inputValue)) {
      setInputError('Invalid URL');
    } else if (
      settings.customProviders
        .filter((_, index) => index !== editProviderIndex)
        .includes(inputValue)
    ) {
      setInputError('Provider already added');
    } else {
      setInputError(undefined);
    }
  }, [editProviderIndex, inputValue, settings.customProviders]);

  return (
    <>
      <FormLabel>Ethereum RPC URLs</FormLabel>
      <Flex mb="3">
        <Flex direction="column" width="100%">
          <Input
            bg="black"
            borderColor="whiteAlpha.400"
            placeholder="e.g. https://mainnet.infura.io/v3/api_key"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            ref={inputRef}
          />
          {inputError && (
            <Text fontSize="sm" color="red.500">
              {inputError}
            </Text>
          )}
        </Flex>
        <IconButton
          disabled={!inputValue.trim() || inputError !== undefined}
          ml="3"
          variant="outline"
          background={'teal.900'}
          borderColor={'teal.700'}
          _hover={{
            background: 'teal.900',
            borderColor: 'teal.700',
          }}
          icon={<PlusIcon style={{ opacity: 0.5, color: 'white' }} />}
          aria-label={'Add provider'}
          onClick={() => addEditProvider()}
        />
      </Flex>

      {settings.customProviders.map((provider, index) => (
        <Flex key={index} ml={2} alignItems="center">
          <Text
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            overflow="hidden"
            width="100%"
            borderColor="whiteAlpha.400"
            placeholder="e.g. https://mainnet.infura.io/v3/api_key"
          >
            {provider}
          </Text>
          <IconButton
            ml="2"
            colorScheme="blackAlpha"
            background="transparent"
            icon={<Pencil1Icon style={{ opacity: 0.5 }} />}
            aria-label={'Edit provider'}
            onClick={() => {
              setInputValue(provider);
              setEditProviderIndex(index);
              inputRef.current?.focus();
            }}
          />
          <IconButton
            colorScheme="blackAlpha"
            background="transparent"
            icon={<Cross2Icon style={{ opacity: 0.5 }} />}
            aria-label={'Remove provider'}
            onClick={() => {
              setInputValue('');
              setEditProviderIndex(undefined);
              removeProvider(index);
            }}
          />
        </Flex>
      ))}
    </>
  );
}
