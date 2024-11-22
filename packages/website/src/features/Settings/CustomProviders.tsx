import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { useStore } from '@/helpers/store';
import { isValidUrl } from '@/helpers/isValidUrl';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

export default function CustomProviders() {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();

  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const { chains } = useCannonChains();

  const inputRef = useRef<HTMLInputElement>(null);

  const addProvider = () => {
    if (inputError || !inputValue.trim()) return;

    setSettings({
      customProviders: [...settings.customProviders, inputValue],
    });
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
    } else {
      setInputError(undefined);
    }
  }, [inputValue]);

  const findChainIdByUrl = (targetUrl: string) => {
    // Look through all chains
    for (const chain of chains) {
      const urls = chain.rpcUrls?.default?.http;
      if (urls?.includes(targetUrl)) {
        return chain.id;
      }
    }
    return undefined;
  };

  return (
    <div className="space-y-2">
      <Label>Ethereum RPC URLs</Label>

      <div className="space-y-2">
        {settings.customProviders.map((url, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-3 py-1 rounded-lg bg-secondary overflow-x-auto max-w-full group"
          >
            <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
              <span className="text-sm truncate whitespace-nowrap">{url}</span>
              {findChainIdByUrl(url) ? (
                <Badge
                  variant="outline"
                  className="shrink-0 opacity-50 px-1.5 whitespace-nowrap"
                >
                  Chain ID: {findChainIdByUrl(url)}
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  className="shrink-0 whitespace-nowrap"
                >
                  Unable to connect
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeProvider(index)}
              className="h-8 w-8 shrink-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="e.g. https://mainnet.infura.io/v3/api_key"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            ref={inputRef}
          />
          {inputError && (
            <p className="text-sm text-destructive mt-1">{inputError}</p>
          )}
        </div>
        <Button
          size="icon"
          disabled={!inputValue.trim() || inputError !== undefined}
          onClick={addProvider}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
