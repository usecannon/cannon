'use client';

import { includes } from '@/helpers/array';
import { State, useStore } from '@/helpers/store';
import {
  isValidSafe,
  isValidSafeString,
  parseSafe,
  SafeString,
  safeToString,
  usePendingTransactions,
  useWalletPublicSafes,
} from '@/hooks/safe';
import { CloseIcon, WarningIcon } from '@chakra-ui/icons';
import { FormControl, IconButton, Text, Flex, Tooltip } from '@chakra-ui/react';
import {
  chakraComponents,
  ChakraStylesConfig,
  CreatableSelect,
  GroupBase,
  OptionProps,
  SingleValue,
  SingleValueProps,
} from 'chakra-react-select';
import deepEqual from 'fast-deep-equal';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSwitchChain } from 'wagmi';
import omit from 'lodash/omit';

import Chain from '@/features/Search/PackageCard/Chain';
import { truncateAddress } from '@/helpers/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

type SafeOption = {
  value: SafeString;
  label: string;
  isDeletable?: boolean;
};

import { useCallback } from 'react';

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe);
  const safeAddresses = useStore((s) => s.safeAddresses);
  const setCurrentSafe = useStore((s) => s.setCurrentSafe);

  // This state prevents the initialization useEffect (which sets the selected safe from the url or the currentSafe)
  // from running when clearing the input
  // It's set to true when clearing, which allows us to:
  // 1. Set currentSafe to null
  // 2. Wait for the router to clear chainId and address query params
  // 3. Reset isClearing to false, allowing normal behavior to resume
  const [isClearing, setIsClearing] = useState(false);

  const deleteSafe = useStore((s) => s.deleteSafe);
  const prependSafeAddress = useStore((s) => s.prependSafeAddress);

  const walletSafes = useWalletPublicSafes();
  const pendingServiceTransactions = usePendingTransactions(
    currentSafe || undefined
  );
  const { chains } = useCannonChains();
  const { switchChain } = useSwitchChain();

  const router = useRouter();

  const safeOptions = _safesToOptions(safeAddresses, { isDeletable: true });
  const walletSafeOptions = _safesToOptions(
    walletSafes.filter((s: any) => !includes(safeAddresses, s))
  );

  // If the user puts a correct address in the input, update the url
  const handleNewOrSelectedSafe = useCallback(
    async (safeString: string) => {
      if (safeString == '') {
        setIsClearing(true);
        setCurrentSafe(null);
        await router.push({
          pathname: router.pathname,
          query: omit(router.query, ['chainId', 'address']),
        });
        setIsClearing(false);
        return;
      }

      const parsedSafeInput = parseSafe(safeString);
      if (!parsedSafeInput) {
        return;
      }

      if (!isValidSafe(parsedSafeInput, chains)) {
        return;
      }

      await router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          chainId: parsedSafeInput.chainId.toString(),
          address: parsedSafeInput.address,
        },
      });
    },
    [chains, router, setCurrentSafe]
  );

  function handleSafeDelete(safeString: SafeString) {
    deleteSafe(parseSafe(safeString));
  }

  const chakraStyles: ChakraStylesConfig<
    SafeOption,
    boolean,
    GroupBase<SafeOption>
  > = {
    container: (provided) => ({
      ...provided,
      borderColor: !currentSafe ? 'teal.700' : 'gray.700',
      background: 'black',
      cursor: 'pointer',
    }),
    menuList: (provided) => ({
      ...provided,
      borderColor: 'whiteAlpha.400',
      background: 'black',
      py: 0,
    }),
    groupHeading: (provided) => ({
      ...provided,
      background: 'black',
    }),
    option: (provided) => ({
      ...provided,
      background: 'black',
      _selected: {
        bg: 'gray.800',
      },
      _hover: {
        bg: 'gray.900',
      },
    }),
    noOptionsMessage: () => ({
      height: 2,
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      background: 'black',
    }),
    control: (provided) => ({
      ...provided,
      '& hr.chakra-divider': {
        display: 'none',
      },
    }),
  };

  // Load the safe address from url
  useEffect(() => {
    const loadSafeFromUrl = async () => {
      if (isClearing) {
        return;
      }

      const { address, chainId } = router.query;

      if (address && chainId) {
        const safeFromUrl = parseSafe(`${chainId}:${address}`);
        if (!safeFromUrl || !isValidSafe(safeFromUrl, chains)) {
          throw new Error(
            "We couldn't find a safe for the specified chain. If it is a custom chain, please ensure that a custom provider is properly configured in the settings page."
          );
        }

        if (!deepEqual(currentSafe, safeFromUrl)) {
          setCurrentSafe(safeFromUrl);
        }

        if (!includes(safeAddresses, safeFromUrl)) {
          prependSafeAddress(safeFromUrl);
        }

        if (switchChain) {
          await switchChain({ chainId: safeFromUrl.chainId });
        }
      } else if (currentSafe) {
        await handleNewOrSelectedSafe(safeToString(currentSafe));
      }
    };

    void loadSafeFromUrl();
  }, [
    chains,
    currentSafe,
    handleNewOrSelectedSafe,
    isClearing,
    prependSafeAddress,
    router,
    safeAddresses,
    setCurrentSafe,
    switchChain,
  ]);

  return (
    <Flex alignItems="center" gap={3}>
      <FormControl>
        <CreatableSelect
          instanceId={'safe-address-select'}
          chakraStyles={chakraStyles}
          value={currentSafe ? _safeToOption(currentSafe) : null}
          placeholder="Select a Safe"
          noOptionsMessage={() => ''}
          isClearable
          options={[
            {
              label: 'Connected Safes',
              options: safeOptions,
            },
            {
              label: 'Owned Safes',
              options: walletSafeOptions,
            },
          ]}
          onChange={(selected) =>
            handleNewOrSelectedSafe(
              (selected as SingleValue<SafeOption>)?.value || ''
            )
          }
          onCreateOption={handleNewOrSelectedSafe}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore-next-line
          onDeleteOption={(selected: SafeOption) =>
            handleSafeDelete(selected?.value || null)
          }
          isValidNewOption={isValidSafeString}
          components={{
            Option: DeletableOption,
            SingleValue: SelectedOption,
            MenuList: CustomMenuList,
          }}
        />
      </FormControl>
      {currentSafe && pendingServiceTransactions.count > 0 && (
        <Tooltip
          label={`There ${
            pendingServiceTransactions.count === 1
              ? ' is 1 pending transaction'
              : ` are ${pendingServiceTransactions.count} pending transactions`
          } on the Safe{Wallet} app. Any transactions executed using Cannon will override transactions there.`}
        >
          <WarningIcon color="orange.400" boxSize="5" />
        </Tooltip>
      )}
    </Flex>
  );
}

function SelectedOption({
  ...props
}: SingleValueProps<SafeOption> & { selectProps?: { onDeleteOption?: any } }) {
  return (
    <chakraComponents.SingleValue {...props}>
      <Flex
        justifyContent="space-between"
        data-test-id="selected-safe-container"
      >
        {/* @notice: Tooltip is not working for this component */}
        <Tooltip
          label={props.data.value}
          aria-label="Safe Address"
          maxW="fit-content"
        >
          <Text letterSpacing="1px" fontFamily="monospace">
            {truncateAddress(props.data.value.split(':')[1], 10)}
          </Text>
        </Tooltip>
        <Chain id={parseInt(props.data.value.split(':')[0])} />
      </Flex>
    </chakraComponents.SingleValue>
  );
}

function DeletableOption({
  ...props
}: OptionProps<SafeOption> & {
  selectProps?: { onDeleteOption?: (value: SafeOption) => void };
}) {
  const onDelete = props.selectProps?.onDeleteOption;
  const chainId = parseInt(props.data.value.split(':')[0]);
  const address = props.data.value.split(':')[1];
  return (
    <chakraComponents.Option {...props}>
      <Flex alignItems="center" width="100%">
        <Tooltip label={address} aria-label="Safe Address" maxW="fit-content">
          <Text letterSpacing="1px" fontFamily="monospace">
            {truncateAddress(address, 10)}
          </Text>
        </Tooltip>
        <Flex grow={1} justifyContent="flex-end">
          <Chain id={chainId} hideId />
          {onDelete && props.data.isDeletable && (
            <IconButton
              _hover={{ bg: 'gray.300' }}
              ml={2}
              size="xs"
              variant="ghost"
              aria-label="Delete Option"
              icon={<CloseIcon color={'white'} />}
              onClick={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                onDelete(props.data);
              }}
            />
          )}
        </Flex>
      </Flex>
    </chakraComponents.Option>
  );
}

function CustomMenuList({ children, ...props }: any) {
  return (
    <chakraComponents.MenuList {...props}>
      <Text color="gray.400" fontSize="xs" my={2} ml={4}>
        To add a Safe, enter it in the format chainId:safeAddress
      </Text>
      {children}
    </chakraComponents.MenuList>
  );
}

function _safeToOption(
  safe: State['currentSafe'],
  extraProps: { isDeletable?: boolean } = {}
) {
  const option = {
    value: safeToString(safe as any),
    label: safeToString(safe as any) as string,
  } as SafeOption;
  if (extraProps.isDeletable) option.isDeletable = true;
  return option;
}

function _safesToOptions(
  safes: State['safeAddresses'],
  extraProps: { isDeletable?: boolean } = {}
) {
  return safes.map((s: any) => _safeToOption(s, extraProps));
}
