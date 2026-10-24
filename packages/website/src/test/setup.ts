import '@testing-library/jest-dom/vitest'; // v7: vitest entry provides the chai Assertion typings
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
