import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { useStore } from '@/helpers/store';
import { isValidUrl } from '@/helpers/isValidUrl';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

// example:baseSepolia
// ChainId: 84532
// URL: https://safe-transaction-base-sepolia.safe.global

export default function CustomSafeTxServices() {
  const [inputUrl, setInputUrl] = useState('');
  const [inputChainId, setInputChainId] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();

  const safeTxServices = useStore((s) => s.safeTxServices);
  const setSafeTxServices = useStore((s) => s.setSafeTxServices);

  const addService = () => {
    if (inputError || !inputUrl.trim() || !inputChainId.trim()) return;

    const chainId = parseInt(inputChainId);

    // Check if service for this chain already exists
    const exists = safeTxServices.some(
      (service) => service.chainId === chainId
    );
    if (exists) {
      setInputError('A service for this chain ID already exists');
      return;
    }

    setSafeTxServices([...safeTxServices, { chainId, url: inputUrl }]);
    setInputUrl('');
    setInputChainId('');
  };

  const removeService = (chainId: number) => {
    const updatedServices = safeTxServices.filter(
      (service) => service.chainId !== chainId
    );
    setSafeTxServices(updatedServices);
  };

  useEffect(() => {
    if (inputUrl === '') {
      setInputError(undefined);
    } else if (!isValidUrl(inputUrl)) {
      setInputError('Invalid URL');
    } else {
      setInputError(undefined);
    }
  }, [inputUrl]);

  useEffect(() => {
    if (inputChainId && !/^\d+$/.test(inputChainId)) {
      setInputError('Chain ID must be a number');
    }
  }, [inputChainId]);

  return (
    <div className="space-y-2">
      <Label>Safe Transaction Services</Label>

      <div className="space-y-2">
        {safeTxServices.map((service) => (
          <div
            key={service.chainId}
            className="flex items-center justify-between pl-3 pr-1 py-1 rounded-lg bg-accent/50 overflow-x-auto max-w-full group"
          >
            <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
              <span className="text-sm truncate whitespace-nowrap">
                {service.url}
              </span>
              <Badge
                variant="secondary"
                className="shrink-0 opacity-50 px-1.5 whitespace-nowrap"
              >
                Chain ID: {service.chainId}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeService(service.chainId)}
              className="h-8 w-8 shrink-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Chain ID"
            value={inputChainId}
            onChange={(e) => setInputChainId(e.target.value)}
            type="number"
            className="w-32"
          />
          <Input
            placeholder="e.g. https://safe-transaction.mainnet.gnosis.io"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1"
          />
        </div>
        <Button
          size="icon"
          disabled={
            !inputUrl.trim() || !inputChainId.trim() || inputError !== undefined
          }
          onClick={addService}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {inputError && <p className="text-sm text-destructive">{inputError}</p>}
    </div>
  );
}
