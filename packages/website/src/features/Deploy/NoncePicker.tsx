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
  Tooltip,
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

  console.log('safeTxs', safeTxs);

  useEffect(() => {
    handleChange(currentNonce);
  }, [currentNonce]);

  useEffect(() => {
    if (!safeTxs.nextNonce) return setCurrentNonce(null);
    setCurrentNonce(isOverridingNonce ? safeTxs.nextNonce - 1 : null);
  }, [isOverridingNonce, safeTxs.nextNonce]);

  return (
    <FormControl mb={4}>
      <HStack>
        <Tooltip
          label={
            safeTxs.staged.length === 0
              ? 'To override nonce, you must have at least one transaction staged'
              : ''
          }
          placement="top"
          aria-label="Override Previously Staged Transaction"
          shouldWrapChildren
        >
          <Checkbox
            disabled={!safeTxs.isSuccess || safeTxs.staged.length === 0}
            isChecked={isOverridingNonce}
            onChange={(e) => setNonceOverride(e.target.checked)}
          >
            Override Previously Staged Transaction{' '}
          </Checkbox>
        </Tooltip>
        {isOverridingNonce && (
          <NumberInput
            min={Number(safeTxs.nonce) || 0}
            value={currentNonce || 0}
            onChange={(n) => {
              const newVal = Number.parseInt(n);
              if (!Number.isSafeInteger(newVal) || newVal < 0) return;
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
