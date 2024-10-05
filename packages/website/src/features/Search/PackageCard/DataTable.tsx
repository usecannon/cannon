// @ts-nocheck
import * as React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  chakra,
  Tooltip,
  Text,
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpDownIcon,
  ArrowRightIcon,
  QuestionOutlineIcon,
} from '@chakra-ui/icons';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import Chain from './Chain';
import { format, formatDistanceToNow } from 'date-fns';
import NextLink from 'next/link';

export type DataTableProps<Data extends object> = {
  data: Data[];
  columns: any[];
  packageName: string;
};

const formatIPFS = (input: string, partLength: number): string => {
  if (!input) return '';
  const prefix = 'ipfs://';
  const hash = input.substring(prefix.length);

  if (hash.length <= partLength * 2) {
    return input;
  }

  const startPart = hash.substring(0, partLength);
  const endPart = hash.substring(hash.length - partLength);

  return `${prefix}${startPart}...${endPart}`;
};

const LinkableCell = ({ href }: { href: string }) => (
  <NextLink href={href} passHref>
    <Link position="absolute" display="block" w="100%" h="100%" />
  </NextLink>
);

// TODO: add types
const getCellContent = ({ cell }: { cell: any }) => {
  const timeAgo = formatDistanceToNow(
    new Date(cell.row.original.published * 1000),
    {
      addSuffix: true,
    }
  );

  const tooltipTime = format(
    new Date(cell.row.original.published * 1000),
    'PPPppp'
  );

  switch (cell.column.columnDef.accessorKey) {
    case 'chain': {
      return <Chain id={cell.row.original.chain} />;
    }
    case 'deployUrl': {
      return (
        <Text fontFamily="mono" fontSize="12px" transform="translateY(1px)">
          {formatIPFS(cell.row.original.deployUrl, 10)}
        </Text>
      );
    }
    case 'published': {
      return <Tooltip label={tooltipTime}>{timeAgo}</Tooltip>;
    }
    case 'arrow': {
      return <ArrowRightIcon boxSize={3} />;
    }
    default: {
      return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
    }
  }
};

export function DataTable<Data extends object>({
  data,
  columns,
  packageName,
}: DataTableProps<Data>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'published', desc: true },
  ]);
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <Table size="sm">
      <Thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = header.column.columnDef.meta;
              return (
                <Th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  isNumeric={meta?.isNumeric}
                  color="gray.200"
                  borderColor="gray.600"
                  textTransform="none"
                  letterSpacing="normal"
                  fontSize="sm"
                  fontWeight={500}
                  py={2}
                  cursor="pointer"
                  whiteSpace="nowrap"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {header.column.columnDef.accessorKey !== 'arrow' && (
                    <chakra.span display="inline-block" h="12px" w="12px">
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === 'desc' ? (
                          <ChevronDownIcon
                            boxSize={4}
                            aria-label="sorted descending"
                            transform="translateY(2.5px)"
                          />
                        ) : (
                          <ChevronUpIcon
                            boxSize={4}
                            aria-label="sorted ascending"
                            transform="translateY(-2.5px)"
                          />
                        )
                      ) : (
                        <ArrowUpDownIcon
                          boxSize={2.5}
                          transform="translateX(2.5px)"
                        />
                      )}
                    </chakra.span>
                  )}
                  {header.column.columnDef.accessorKey == 'preset' && (
                    <Tooltip label="Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.">
                      <QuestionOutlineIcon ml={1.5} opacity={0.8} />
                    </Tooltip>
                  )}
                </Th>
              );
            })}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {table.getRowModel().rows.map((row, rowInd) => {
          const variant = `${row.original.chain}-${row.original.preset}`;
          return (
            <Tr key={row.id} _hover={{ backgroundColor: 'gray.900' }}>
              {row.getVisibleCells().map((cell) => {
                // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
                const meta: any = cell.column.columnDef.meta;

                return (
                  <Td
                    key={cell.id}
                    position="relative"
                    overflow="hidden"
                    isNumeric={meta?.isNumeric}
                    borderColor="gray.600"
                    borderBottom={
                      table.getRowModel().rows.length == rowInd + 1
                        ? 'none'
                        : undefined
                    }
                    whiteSpace="nowrap"
                  >
                    <LinkableCell
                      href={`/packages/${packageName}/${row.original.version}/${variant}`}
                    />
                    {getCellContent({ cell })}
                  </Td>
                );
              })}
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
