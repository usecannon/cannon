import { SafeDefinition } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { Checkbox, FormControl, Flex, Select, Tooltip } from '@chakra-ui/react';
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
    if (!safeTxs.nextNonce) return setCurrentNonce(null);
    setCurrentNonce(isOverridingNonce ? safeTxs.nextNonce - 1 : null);
  }, [isOverridingNonce, safeTxs.nextNonce]);

  return (
    <FormControl mb={4}>
      <Flex
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
        gap={4}
      >
        <Tooltip
          label={
            safeTxs.staged.length === 0
              ? 'You must have at least one transaction staged to override'
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
          <Flex direction="row" align="center" justify="space-between" grow={1}>
            <Select
              value={currentNonce ?? undefined}
              onChange={(e) => {
                const newVal = Number(e.target.value);
                if (!Number.isSafeInteger(newVal) || newVal < 0) {
                  setCurrentNonce(null);
                } else {
                  setCurrentNonce(newVal);
                }
              }}
            >
              {safeTxs.staged.map(({ txn }) => (
                <option key={txn._nonce} value={txn._nonce}>
                  {txn._nonce}
                </option>
              ))}
            </Select>
          </Flex>
        )}
      </Flex>
    </FormControl>
  );
}
