import { Alert } from '@/components/Alert';
import { links } from '@/constants/links';
import { includes } from '@/helpers/array';
import { State, useStore } from '@/helpers/store';
import {
  getSafeFromString,
  getSafeUrl,
  isValidSafe,
  isValidSafeString,
  parseSafe,
  SafeString,
  safeToString,
  usePendingTransactions,
  useWalletPublicSafes,
} from '@/hooks/safe';
import { CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import {
  FormControl,
  IconButton,
  Link,
  Text,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import {
  chakraComponents,
  ChakraStylesConfig,
  CreatableSelect,
  GroupBase,
  OptionProps,
  SingleValueProps,
} from 'chakra-react-select';
import deepEqual from 'fast-deep-equal';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSwitchChain } from 'wagmi';
import Chain from '@/features/Search/PackageCard/Chain';
import { truncateAddress } from '@/helpers/ethereum';

type SafeOption = {
  value: SafeString;
  label: string;
  isDeletable?: boolean;
};

export function SafeAddressInput() {
  const currentSafe = useStore((s: any) => s.currentSafe);
  const safeAddresses = useStore((s: any) => s.safeAddresses);
  const setState = useStore((s: any) => s.setState);
  const setCurrentSafe = useStore((s: any) => s.setCurrentSafe);
  const deleteSafe = useStore((s: any) => s.deleteSafe);
  const prependSafeAddress = useStore((s: any) => s.prependSafeAddress);
  const walletSafes = useWalletPublicSafes();
  const pendingServiceTransactions = usePendingTransactions(currentSafe);

  const { switchChain } = useSwitchChain();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeOptions = _safesToOptions(safeAddresses, { isDeletable: true });
  const walletSafeOptions = _safesToOptions(
    walletSafes.filter((s: any) => !includes(safeAddresses, s))
  );

  // Load the safe address from url
  useEffect(() => {
    if (searchParams.has('address') || searchParams.has('chainId')) {
      const chainId = searchParams.get('chainId');
      const address = searchParams.get('address');
      const newSafe = parseSafe(`${chainId}:${address}`);

      if (isValidSafe(newSafe)) {
        if (!deepEqual(currentSafe, newSafe)) {
          setState({ currentSafe: newSafe });
        }

        if (!includes(safeAddresses, newSafe)) {
          prependSafeAddress(newSafe);
        }

        if (switchChain) {
          switchChain({ chainId: newSafe.chainId });
        }
      } else {
        const newSearchParams = new URLSearchParams(
          Array.from(searchParams.entries())
        );
        newSearchParams.delete('chainId');
        newSearchParams.delete('address');
        const search = newSearchParams.toString();
        const query = `${'?'.repeat(search.length && 1)}${search}`;
        router.push(`${pathname}${query}`);
      }
    }
  }, []);

  // Keep the current safe in the url params
  useEffect(() => {
    if (
      pathname.startsWith(links.DEPLOY) &&
      currentSafe &&
      !searchParams.has('address') &&
      !searchParams.has('chainId')
    ) {
      const newSearchParams = new URLSearchParams(
        Array.from(searchParams.entries())
      );
      newSearchParams.set('chainId', currentSafe.chainId.toString());
      newSearchParams.set('address', currentSafe.address);
      const search = newSearchParams.toString();
      const query = `${'?'.repeat(search.length && 1)}${search}`;
      router.push(`${pathname}${query}`);
    }
  }, [pathname]);

  // If the user puts a correct address in the input, update the url
  function handleSafeChange(safeString: SafeString) {
    if (!safeString) {
      const newSearchParams = new URLSearchParams(
        Array.from(searchParams.entries())
      );
      newSearchParams.delete('chainId');
      newSearchParams.delete('address');
      const search = newSearchParams.toString();
      const query = `${'?'.repeat(search.length && 1)}${search}`;
      router.push(`${pathname}${query}`);
      setState({ currentSafe: null });
      return;
    }

    const selectedSafe = parseSafe(safeString);

    setCurrentSafe(selectedSafe);
    const newSearchParams = new URLSearchParams(
      Array.from(searchParams.entries())
    );
    newSearchParams.set('chainId', selectedSafe.chainId.toString());
    newSearchParams.set('address', selectedSafe.address);
    const search = newSearchParams.toString();
    const query = `${'?'.repeat(search.length && 1)}${search}`;
    router.push(`${pathname}${query}`);

    if (switchChain) {
      switchChain({ chainId: selectedSafe.chainId });
    }
  }

  function handleSafeCreate(newSafeAddress: string) {
    const newSafe = getSafeFromString(newSafeAddress);
    if (newSafe) {
      prependSafeAddress(newSafe);
      setState({ currentSafe: newSafe });

      const newSearchParams = new URLSearchParams(
        Array.from(searchParams.entries())
      );
      newSearchParams.set('chainId', newSafe.chainId.toString());
      newSearchParams.set('address', newSafe.address);
      const search = newSearchParams.toString();
      const query = `${'?'.repeat(search.length && 1)}${search}`;
      router.push(`${pathname}${query}`);

      if (switchChain) {
        switchChain({ chainId: newSafe.chainId });
      }
    }
  }

  function handleSafeDelete(safeString: SafeString) {
    deleteSafe(parseSafe(safeString));
  }

  const isEmpty = !currentSafe;

  const chakraStyles: ChakraStylesConfig<
    SafeOption,
    boolean,
    GroupBase<SafeOption>
  > = {
    container: (provided) => ({
      ...provided,
      borderColor: isEmpty ? 'teal.700' : 'gray.700',
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

  return (
    <>
      <FormControl>
        <CreatableSelect
          instanceId={'safe-address-select'}
          chakraStyles={chakraStyles}
          isClearable
          value={currentSafe ? _safeToOption(currentSafe) : null}
          placeholder="Select a Safe"
          noOptionsMessage={() => ''}
          options={[
            ...safeOptions,
            {
              label: 'Connected Wallet Safes',
              options: walletSafeOptions,
            },
          ]}
          onChange={(selected: any) =>
            handleSafeChange(selected?.value || null)
          }
          onCreateOption={handleSafeCreate}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore-next-line
          onDeleteOption={(selected: SafeOption) =>
            handleSafeDelete(selected?.value || null)
          }
          isValidNewOption={(input: any) => {
            return isValidSafeString(input);
          }}
          components={{
            Option: DeletableOption,
            SingleValue: SelectedOption,
            MenuList: CustomMenuList,
          }}
        />
      </FormControl>
      {currentSafe && pendingServiceTransactions.count > 0 && (
        <Alert status="warning">
          There
          {pendingServiceTransactions.count === 1
            ? ' is 1 pending transaction'
            : ` are ${pendingServiceTransactions.count} pending transactions`}
          {' on the '}
          <Link
            href={getSafeUrl(currentSafe, '/transactions/queue')}
            isExternal
          >
            <Text as="b">Safe App</Text>
            <ExternalLinkIcon transform="translate(4px,-2px)" />
          </Link>
          &nbsp; Keep in mind that any transactions executed on this app will
          override the ones on Safe.
        </Alert>
      )}
    </>
  );
}

function SelectedOption({
  ...props
}: SingleValueProps<SafeOption> & { selectProps?: { onDeleteOption?: any } }) {
  return (
    <chakraComponents.SingleValue {...props}>
      <Flex justifyContent="space-between">
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
      {children}
      <Text color="gray.400" fontSize="xs" textAlign="center" mb={2}>
        To add a Safe, enter it in the format chainId:safeAddress
      </Text>
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
