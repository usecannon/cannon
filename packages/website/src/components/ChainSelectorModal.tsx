import { useSwitchChain, useChainId } from 'wagmi';
import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';
import Chain from '@/features/Search/PackageCard/Chain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const ChainButton = ({
  switching,
  connected,
  chain,
  onClick,
}: {
  switching?: boolean;
  connected: boolean;
  chain: {
    id: number;
    name: string;
  };
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center px-2 py-1 mb-2 cursor-pointer border border-zinc-700 rounded-md hover:bg-black/40"
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-2 items-center">
          <Chain id={chain.id} />
        </div>
        {connected ? (
          <span
            className="text-sm text-emerald-400 font-medium uppercase tracking-wider text-mono"
            style={{ textShadow: '0px 0px 4px #00ff00' }}
          >
            Connected
          </span>
        ) : switching ? (
          <span
            className="text-sm text-yellow-400 font-medium uppercase tracking-wider text-mono"
            style={{ textShadow: '0px 0px 4px #ffff00' }}
          >
            Confirm in wallet
          </span>
        ) : null}
      </div>
    </div>
  );
};

const ChainSelectorModal = ({
  onClose,
  isOpen,
}: {
  onClose: () => void;
  isOpen: boolean;
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { chains, switchChain, isSuccess, isError } = useSwitchChain();

  const [switchingToChainId, setSwitchingToChainId] = useState<number | null>(
    null
  );
  const chainId = useChainId();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChains = chains.filter((chain) =>
    chain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close the modal when the chain switch is successful or failed,
  // use the switchingToChainId to determine if the chain switch is in progress
  useEffect(() => {
    if (isSuccess && switchingToChainId !== null) {
      onClose();
      setSwitchingToChainId(null);
      setSearchTerm('');
    }
  }, [isSuccess, onClose]);

  useEffect(() => {
    if (isError && switchingToChainId !== null) {
      setSwitchingToChainId(null);
    }
  }, [isError, onClose]);

  // Popular chains
  const popularChainsIds = [13370, 1, 10, 8453, 42161];
  const popularChains = chains.filter((chain) =>
    popularChainsIds.includes(chain.id)
  );

  const otherChains = chains.filter(
    (chain) => !popularChainsIds.includes(chain.id)
  );

  const handleSearchChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    300
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[50vh] overflow-auto border-border">
        <DialogHeader>
          <DialogTitle>Select Chain</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="relative w-full mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
            <Input
              onChange={handleSearchChange}
              ref={searchInputRef}
              className="pl-9 bg-transparent border-zinc-600"
            />
          </div>

          {searchTerm && filteredChains.length === 0 && (
            <h2 className="my-32 text-zinc-200 text-sm font-medium">
              No chains found
            </h2>
          )}

          {searchTerm && filteredChains.length > 0 && (
            <div className="w-full">
              <h2 className="mb-2 text-zinc-200 text-sm font-medium">
                Search Results
              </h2>
              {filteredChains.map((chain, k) => (
                <ChainButton
                  key={`${chain.id} - ${k}`}
                  connected={chainId === chain.id}
                  switching={switchingToChainId === chain.id}
                  chain={{
                    id: chain.id,
                    name: chain.name,
                  }}
                  onClick={() => {
                    setSwitchingToChainId(chain.id);
                    switchChain({
                      chainId: chain.id,
                    });
                  }}
                />
              ))}
            </div>
          )}

          {!searchTerm && (
            <div className="w-full">
              <div className="mb-4">
                <h2 className="mb-2 text-zinc-200 text-sm font-medium">
                  Popular Chains
                </h2>
                {popularChains.map((chain, k) => (
                  <ChainButton
                    key={`${chain.id} - ${k}`}
                    connected={chainId === chain.id}
                    switching={switchingToChainId === chain.id}
                    chain={{
                      id: chain.id,
                      name: chain.name,
                    }}
                    onClick={() => {
                      setSwitchingToChainId(chain.id);
                      switchChain({
                        chainId: chain.id,
                      });
                    }}
                  />
                ))}
              </div>
              <h2 className="mb-1.5 text-zinc-200 text-sm font-medium">
                Other Chains
              </h2>
              {otherChains.map((chain, k) => (
                <ChainButton
                  key={`${chain.id} - ${k}`}
                  switching={switchingToChainId === chain.id}
                  connected={chainId === chain.id}
                  chain={{
                    id: chain.id,
                    name: chain.name,
                  }}
                  onClick={() => {
                    setSwitchingToChainId(chain.id);
                    switchChain({
                      chainId: chain.id,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChainSelectorModal;
