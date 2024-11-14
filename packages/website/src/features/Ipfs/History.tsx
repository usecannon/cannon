'use client';

import { ChevronRight } from 'lucide-react';
import { ItemBase } from '@/helpers/db';

interface HistoryProps {
  items: ItemBase[];
}

export function History({ items }: HistoryProps) {
  return (
    <div className="p-6 bg-gray-800 block border border-gray-600 rounded-md">
      <h2 className="text-lg font-semibold pb-4 mb-4">History</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <div className="flex items-center gap-2">
              <code className="font-mono flex items-center">
                <ChevronRight className="h-4 w-4 text-white" />
                <a
                  href={`/ipfs?cid=${item.id}&compressed=${item.compressed}`}
                  className="hover:underline"
                >
                  ipfs://{item.id}
                </a>
              </code>
              <span className="text-xs text-gray-500">
                ({new Date(item.createdAt).toLocaleDateString('en-US')})
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
