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
  handleChange: (nonce: number) => void;
}

export default function NoncePicker({ safe, handleChange }: Params) {
  const [isOverridingNonce, setNonceOverride] = useState(false);
  const [currentNonce, setCurrentNonce] = useState<number>(1);

  const safeTxs = useSafeTransactions(safe);

  useEffect(() => {
    handleChange(currentNonce);
  }, [currentNonce]);

  useEffect(() => {
    setCurrentNonce(safeTxs.nextNonce);
  }, [safeTxs.nextNonce]);

  useEffect(() => {
    if (!safeTxs.isSuccess) return setCurrentNonce(1);
    const nonce = isOverridingNonce ? safeTxs.nextNonce - 1 : safeTxs.nextNonce;
    setCurrentNonce(nonce);
  }, [isOverridingNonce, safeTxs.isSuccess, safeTxs.nextNonce]);

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
            min={Number(safeTxs.nextNonce - 1 || 1)}
            value={currentNonce || 1}
            onChange={(n) => {
              const newVal = Number.parseInt(n);
              if (!Number.isSafeInteger(newVal) || newVal < 1) return;
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
