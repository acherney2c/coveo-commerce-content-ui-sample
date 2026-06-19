import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchSuggestionsDropdown from './search-suggestions-dropdown.js';
import type { Product } from '@coveo/headless/commerce';

const product = {
  permanentid: 'p1',
  ec_name: 'Kayak Pro',
  ec_product_id: 'KP-1',
} as unknown as Product;

function createInstantProducts(initial: { products: Product[]; isLoading: boolean }) {
  const listeners = new Set<() => void>();
  const ctrl: any = {
    state: { ...initial },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateQuery: vi.fn(),
    interactiveProduct: vi.fn(() => ({ select: vi.fn() })),
    emit(patch: any) {
      ctrl.state = { ...ctrl.state, ...patch };
      listeners.forEach((l) => l());
    },
  };
  return ctrl;
}

function createFilterGen() {
  return {
    filterSuggestions: [],
    subscribe: vi.fn(() => () => {}),
  } as any;
}

function makeState(overrides: Partial<{ value: string; suggestions: string[]; isLoadingSuggestions: boolean }>) {
  const { value = 'kay', suggestions = ['kayak'], isLoadingSuggestions = false } = overrides;
  return {
    value,
    suggestions: suggestions.map((s) => ({ rawValue: s, highlightedValue: s })),
    isLoading: false,
    isLoadingSuggestions,
    searchBoxId: 'sb',
  } as any;
}

describe('SearchSuggestionsDropdown — Instant Products stability', () => {
  afterEach(() => cleanup());

  it('keeps products and the notice visible when suggestions reload (isLoadingSuggestions flips true)', () => {
    const instantProducts = createInstantProducts({ products: [product], isLoading: false });
    const filterGen = createFilterGen();

    const { rerender } = render(
      <MemoryRouter>
        <SearchSuggestionsDropdown
          state={makeState({ value: 'kay', suggestions: ['kayak'], isLoadingSuggestions: false })}
          isOpen
          filterSuggestionsGeneratorController={filterGen}
          instantProductsController={instantProducts}
          onSelectSuggestion={vi.fn()}
          onSelectFilterSuggestion={vi.fn()}
        />
      </MemoryRouter>
    );

    // Products and notice are shown for the committed "kayak"
    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();
    expect(screen.getByText(/Showing results for/)).toBeInTheDocument();

    // User types another char → QuerySuggest reloads (isLoadingSuggestions=true),
    // first suggestion still "kayak". Products and notice must NOT vanish.
    rerender(
      <MemoryRouter>
        <SearchSuggestionsDropdown
          state={makeState({ value: 'kaya', suggestions: ['kayak'], isLoadingSuggestions: true })}
          isOpen
          filterSuggestionsGeneratorController={filterGen}
          instantProductsController={instantProducts}
          onSelectSuggestion={vi.fn()}
          onSelectFilterSuggestion={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();
    expect(screen.getByText(/Showing results for/)).toBeInTheDocument();

    // Settles again with the same first suggestion — still visible, no flash.
    rerender(
      <MemoryRouter>
        <SearchSuggestionsDropdown
          state={makeState({ value: 'kaya', suggestions: ['kayak'], isLoadingSuggestions: false })}
          isOpen
          filterSuggestionsGeneratorController={filterGen}
          instantProductsController={instantProducts}
          onSelectSuggestion={vi.fn()}
          onSelectFilterSuggestion={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();
    // updateQuery only fired once (for "kayak") — no clear+refetch.
    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(instantProducts.updateQuery).toHaveBeenCalledWith('kayak');
  });
});
