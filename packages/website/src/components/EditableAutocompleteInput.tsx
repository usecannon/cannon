import {
  Box,
  Editable,
  EditableInput,
  EditablePreview,
  HStack,
  Popover,
  PopoverAnchor,
  PopoverBody,
  PopoverContent,
  Text,
  VStack,
} from '@chakra-ui/react';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';

export function EditableAutocompleteInput(props: {
  items: { label: string; secondary: string }[];
  defaultValue?: string;
  tabKeys?: string;
  placeholder?: string;
  editable?: boolean;
  unfilteredResults?: boolean;
  onChange: (item: string) => void;
  color: string;
  onPending?: (item: string) => void;
  onFilterChange?: (text: string) => void;
}) {
  const [filterInput, setFilterInput] = useState(props.defaultValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingItem, setPendingItem] = useState('');

  const filteredItems = _.sortBy(
    props.items.filter(
      (i) =>
        props.unfilteredResults ||
        i.label.toLowerCase().includes(filterInput.toLowerCase())
    ),
    (i) => !i.label.toLowerCase().startsWith(filterInput.toLowerCase())
  );

  const completedText = pendingItem
    .toLowerCase()
    .startsWith(filterInput.toLowerCase())
    ? pendingItem.slice(filterInput.length)
    : '';

  if (
    filteredItems.length > 0 &&
    !filteredItems.find((i) => i.label === pendingItem)
  ) {
    setPendingItem(filteredItems[0].label);
    if (props.onPending) props.onPending(filteredItems[0].label);
  }

  const finishEdit = () => {
    setIsEditing(false);

    // must select a valid item from the autocomplete. See if we can do this
    let result = '';
    if (filteredItems.length) {
      result = pendingItem;
    }

    setFilterInput(result);
    props.onChange(result);
  };

  // eslint-disable-next-line no-undef
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    try {
      if (
        event.key == 'Enter' ||
        event.key == 'Return' ||
        event.key == 'Tab' ||
        (props.tabKeys || '').includes(event.key)
      ) {
        // perform "tab"
        event.preventDefault();

        tabToNext();
      }

      if (event.key == 'ArrowDown' || event.key == 'ArrowUp') {
        event.preventDefault();

        if (filteredItems.length > 0) {
          const newIdx = Math.max(
            0,
            Math.min(
              filteredItems.length,
              filteredItems.findIndex((i) => i.label === pendingItem) +
                (event.key == 'ArrowDown' ? 1 : -1)
            )
          );

          setPendingItem(filteredItems[newIdx].label);
          if (props.onPending) props.onPending(filteredItems[newIdx].label);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const inputValue = filterInput || (isEditing ? '' : props.placeholder);

  const editableInputRef = useRef();

  function tabToNext() {
    console.log('tabdata trigger tabtonext');
    const tabElements = Array.from(
      document
        // Get all elements that can be focusable
        // removed [tabindex] from query selector
        .querySelectorAll(
          'a, button, input, textarea, select, details, [tabindex]'
        )
    )

      // remove any that have a tabIndex of -1
      .filter((element) => (element as any).tabIndex > -1)

      // split elements into two arrays, explicit tabIndexs and implicit ones
      .reduce(
        (prev: any, next: any) => {
          return (next as any).tabIndex > 0
            ? [
                [...prev[0], next].sort((a, b) =>
                  (a as any).tabIndex > (b as any).tabIndex ? -1 : 1
                ),
                prev[1],
              ]
            : [prev[0], [...prev[1], next]];
        },
        [[], []]
      )

      // flatten the two-dimensional array
      .flatMap((element) => element);

    const currentIndex = tabElements.findIndex(
      (e: any) => e === editableInputRef.current
    );

    //console.log('tabdata current index', currentIndex);
    //console.log('tabdata', editableInputRef)
    //console.log('tabdata', tabElements);

    const nextIndex = (currentIndex + 1) % tabElements.length;
    tabElements[nextIndex].focus();
  }

  const selectedRef = useRef<HTMLDivElement>();
  const scrollRef = useRef<HTMLElement>();

  function scrollToSelected() {
    if (scrollRef.current && selectedRef.current) {
      scrollRef.current.scrollTop = Math.max(
        selectedRef.current.offsetTop -
          scrollRef.current.clientHeight +
          (selectedRef.current as Element).clientHeight,
        scrollRef.current.scrollTop
      );

      scrollRef.current.scrollTop = Math.min(
        selectedRef.current.offsetTop,
        scrollRef.current.scrollTop
      );
    }
  }

  useEffect(() => {
    scrollToSelected();
  }, [pendingItem, selectedRef.current]);

  return (
    <Popover
      autoFocus={false}
      isOpen={isEditing && filteredItems.length > 0}
      placement="bottom-start"
      returnFocusOnClose={false}
      isLazy
    >
      <PopoverAnchor>
        <HStack
          color={props.color}
          gap={0}
          border="1px solid"
          borderColor={props.editable ? 'whiteAlpha.300' : 'transparent'}
          px={props.editable ? 2 : 0}
          borderRadius="md"
          _hover={{
            borderColor: props.editable ? 'whiteAlpha.400' : 'transparent',
          }}
        >
          <Editable
            isDisabled={!props.editable}
            onEdit={() => setIsEditing(true)}
            onBlur={() => {
              finishEdit();
              tabToNext();
            }}
            onKeyDown={handleKey}
            onChange={(value) => {
              setFilterInput(value);
              if (props.onFilterChange) props.onFilterChange(value);
            }}
            value={inputValue}
            color={filterInput ? props.color || 'black' : 'gray.500'}
            fontFamily={'monospace'}
            whiteSpace="nowrap"
          >
            <EditablePreview />
            <EditableInput
              boxShadow={'none !important'}
              outline={'none !important'}
              ref={editableInputRef as any}
              onFocus={() => setFilterInput('')}
              cursor=""
              width={inputValue?.length ? `${inputValue?.length}ch` : '1px'}
            />
          </Editable>
          {isEditing && <Text color="gray.500">{completedText}</Text>}
        </HStack>
      </PopoverAnchor>
      <PopoverContent
        backgroundColor="black"
        borderColor="whiteAlpha.400"
        margin="-5px"
        maxHeight={'45vh'}
        overflowY={'auto'}
        overflowX={'hidden'}
        ref={scrollRef as any}
      >
        <PopoverBody padding="5px">
          <VStack alignItems="left">
            {filteredItems.map((item, index) => {
              return (
                <AutocompleteOption
                  key={index}
                  item={item}
                  filterInput={filterInput}
                  selected={item.label === pendingItem}
                  isVisible={isEditing && filteredItems.length > 0}
                  onMouseOver={() => setPendingItem(item.label)}
                  onClick={() => {
                    console.log('tabdata click');
                    setPendingItem(item.label);
                    setFilterInput(item.label);
                    tabToNext();
                    console.log('tabdata end');
                  }}
                  internalRef={
                    (item.label === pendingItem
                      ? selectedRef
                      : undefined) as any
                  }
                />
              );
            })}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function AutocompleteOption(props: {
  item: { label: string; secondary: string };
  filterInput: string;
  selected?: boolean;
  onMouseOver: () => void;
  onClick: () => void;
  isVisible: boolean;
  // eslint-disable-next-line no-undef
  internalRef: React.MutableRefObject<HTMLDivElement> | undefined;
}) {
  const regEscape = (v: any) => v.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const matched = props.filterInput
    ? props.item.label.split(new RegExp(regEscape(props.filterInput), 'i'))
    : [props.item.label];

  return (
    <Box
      ref={props.internalRef}
      onMouseOver={props.onMouseOver}
      onClick={(evt) => {
        evt.preventDefault();
        props.onClick();
      }}
      background={props.selected ? 'gray.800' : 'transparent'}
      px="2"
      pb="1"
    >
      <HStack
        onClick={(evt) => {
          evt.preventDefault();
          props.onClick();
        }}
        gap={0}
      >
        {matched.map((p, i) => [
          <Text key={i}>{p}</Text>,
          i < matched.length - 1 ? <Text as="b">{props.filterInput}</Text> : [],
        ])}
      </HStack>
      <Text color="gray.600" fontSize="2xs">
        {props.item.secondary}
      </Text>
    </Box>
  );
}
