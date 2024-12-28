import { CheckIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertIcon,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
} from '@chakra-ui/react';

// Define interface for component props
interface CannonFileInputProps {
  cannonfileUrlInput: string;
  setCannonfileUrlInput: (value: string) => void;
  cannonDefInfo: {
    isFetching: boolean;
    error: any;
    def: any;
  };
  cannonDefInfoError: string;
  isDisabled: boolean;
}

export const CannonFileInput = ({
  cannonfileUrlInput,
  setCannonfileUrlInput,
  cannonDefInfo,
  cannonDefInfoError,
  isDisabled,
}: CannonFileInputProps) => {
  const isLoading = cannonfileUrlInput.length > 0 && cannonDefInfo?.isFetching;
  const showCheck =
    cannonfileUrlInput.length > 0 && !cannonDefInfo.error && cannonDefInfo?.def;

  return (
    <FormControl mb="4">
      <FormLabel>Cannonfile (Optional)</FormLabel>

      <InputGroup>
        <Input
          type="text"
          placeholder="https://github.com/../cannonfile.toml"
          value={cannonfileUrlInput}
          borderColor={!cannonDefInfoError ? 'whiteAlpha.400' : 'red.500'}
          isDisabled={isDisabled}
          background="black"
          onChange={(evt) => setCannonfileUrlInput(evt.target.value)}
        />
        <InputRightElement>
          {isLoading && <Spinner />}
          {showCheck && <CheckIcon color="green.500" />}
        </InputRightElement>
      </InputGroup>

      <FormHelperText color="gray.300">
        The Cannonfile URL is used to generate the deployment data to display a
        git diff in Cannon.
      </FormHelperText>

      {cannonDefInfoError && (
        <Alert mt="6" status="error" bg="gray.700">
          <AlertIcon mr={3} />
          <strong>{cannonDefInfoError.toString()}</strong>
        </Alert>
      )}
    </FormControl>
  );
};
