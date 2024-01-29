import _ from 'lodash';
import { BrowserLevel } from 'browser-level';
import { useEffect, useRef, useState } from 'react';

export interface ItemBase {
  id: string;
  compressed: boolean;
  createdAt: number;
  updatedAt: number;
}

export function useDb<T extends ItemBase>(listName: string) {
  const [db, setDb] = useState<BrowserLevel<string, T> | null>(null);

  useEffect(() => {
    const client = new BrowserLevel<string, T>(listName, {
      valueEncoding: 'json',
    });

    const open = async () => {
      await client.open();
      setDb(client);
    };

    void open();

    return () => {
      if (client.status === 'open') void client.close();
    };
  }, [listName]);

  const add = async (val: Omit<T, 'createdAt' | 'updatedAt'>) => {
    if (!db) return;
    const existing = await db.get(val.id).catch(() => null);
    const now = Date.now();

    const item = existing
      ? {
          ...existing,
          ...val,
          updatedAt: now,
        }
      : {
          ...val,
          createdAt: now,
          updatedAt: now,
        };

    return await db.put(val.id, item as T);
  };

  const del = async (id: string) => {
    if (!db) return;
    return await db.del(id);
  };

  return { add, del, db };
}

export function useItemsList<T extends ItemBase>(listName: string) {
  const { add, del, db } = useDb<T>(listName);
  const itemsRef = useRef<T[]>([]);
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!db) return;

    db.on('put', function (id: string, val: T) {
      itemsRef.current.unshift(val);
      setItems([...itemsRef.current]);
    });

    db.on('del', function (id: string) {
      removeItem(itemsRef.current, (item) => item.id === id);
      setItems([...itemsRef.current]);
    });

    const loadEntries = async () => {
      await db.open();
      const entries = await db.values({ reverse: true }).all();
      itemsRef.current = _.sortBy(entries, 'updatedAt');
      setItems([...itemsRef.current]);
    };

    void loadEntries();

    return () => setItems([]);
  }, [db]);

  return {
    add,
    del,
    items,
  };
}

function removeItem<T>(items: T[], comparator: (item: T) => boolean): void {
  const index = items.findIndex((item) => comparator(item));
  if (index === -1) return;
  items.splice(index, 1);
}
