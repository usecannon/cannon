import { SafeDefinition } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import {
  Checkbox,
  FormControl,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface Params {
  safe: SafeDefinition | null;
  handleChange: (nonce: number | null) => void;
}

export default function NoncePicker({ safe, handleChange }: Params) {
  const [isOverridingNonce, setNonceOverride] = useState(false);
  const [currentNonce, setCurrentNonce] = useState<number | null>(null);

  const safeTxs = useSafeTransactions(safe);

  useEffect(() => {
    handleChange(currentNonce);
  }, [currentNonce]);

  useEffect(() => {
    setCurrentNonce(safeTxs.nextNonce);
  }, [safeTxs.nextNonce]);

  useEffect(() => {
    if (!safeTxs.nextNonce) return setCurrentNonce(null);
    const nonce = isOverridingNonce ? safeTxs.nextNonce - 1 : safeTxs.nextNonce;
    setCurrentNonce(nonce);
  }, [isOverridingNonce, safeTxs.nextNonce]);

  return (
    <FormControl mb={4}>
      <HStack>
        <Checkbox
          disabled={!safeTxs.isSuccess}
          isChecked={isOverridingNonce}
          onChange={(e) => setNonceOverride(e.target.checked)}
        >
          Override Previously Staged Transaction{' '}
        </Checkbox>
        {isOverridingNonce && (
          <NumberInput
            min={Number(safeTxs.nonce)}
            value={currentNonce || 0}
            onChange={(n) => {
              const newVal = Number.parseInt(n);
              if (!Number.isSafeInteger(newVal)) return;
              setCurrentNonce(newVal);
            }}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        )}
      </HStack>
    </FormControl>
  );
}
