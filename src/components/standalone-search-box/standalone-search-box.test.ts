import { describe, expect, it } from 'vitest';
import { buildStandaloneRedirectSearch } from './standalone-search-box.js';

describe('buildStandaloneRedirectSearch', () => {
  it('encodes spaces as %20 for the search page URL manager', () => {
    expect(
      buildStandaloneRedirectSearch('?sortCriteria=relevance', 'blue chair')
    ).toBe('?sortCriteria=relevance&q=blue%20chair');
  });

  it('preserves literal plus signs while encoding spaces', () => {
    expect(
      buildStandaloneRedirectSearch('?sortCriteria=relevance', 'C++ chair')
    ).toBe('?sortCriteria=relevance&q=C%2B%2B%20chair');
  });
});