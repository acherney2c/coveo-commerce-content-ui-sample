import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffectiveQueryDriver } from './use-effective-query-driver.js';

/**
 * Creates a mock InstantProducts controller.
 */
function createMockInstantProducts() {
  const listeners = new Set<() => void>();
  const ctrl: any = {
    state: { products: [], isLoading: false },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateQuery: vi.fn(),
    interactiveProduct: vi.fn(() => ({ select: vi.fn() })),
    emit(patch: Partial<typeof ctrl.state>) {
      ctrl.state = { ...ctrl.state, ...patch };
      listeners.forEach((l) => l());
    },
  };
  return ctrl;
}

/**
 * Creates a mock FilterSuggestionsGenerator with N filter controllers.
 */
function createMockFilterSuggestionsGenerator(count = 1) {
  const filters = Array.from({ length: count }, () => ({
    updateQuery: vi.fn(),
    clear: vi.fn(),
    state: { facetId: `facet-${Math.random()}`, values: [], displayName: 'Test' },
    subscribe: vi.fn(() => () => {}),
  }));
  return {
    filterSuggestions: filters,
    subscribe: vi.fn(() => () => {}),
  } as any;
}

describe('useEffectiveQueryDriver', () => {
  it('calls both instantProducts.updateQuery and each filterSuggestion.updateQuery with the First Suggestion once settled', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(2);

    const { rerender } = renderHook(
      (props) => useEffectiveQueryDriver(props),
      {
        initialProps: {
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak', 'tandem kayak'],
          isLoadingSuggestions: true,
          typedQuery: 'kay',
          minChars: 3,
        },
      }
    );

    // While suggestions are loading, neither fires
    expect(instantProducts.updateQuery).not.toHaveBeenCalled();
    expect(filterGen.filterSuggestions[0].updateQuery).not.toHaveBeenCalled();
    expect(filterGen.filterSuggestions[1].updateQuery).not.toHaveBeenCalled();

    // Suggestions settle
    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak', 'tandem kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      });
    });

    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(instantProducts.updateQuery).toHaveBeenCalledWith('kayak');
    expect(filterGen.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);
    expect(filterGen.filterSuggestions[0].updateQuery).toHaveBeenCalledWith('kayak');
    expect(filterGen.filterSuggestions[1].updateQuery).toHaveBeenCalledTimes(1);
    expect(filterGen.filterSuggestions[1].updateQuery).toHaveBeenCalledWith('kayak');
  });

  it('falls back to typed query when no suggestions settle empty', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    // Realistic: a QuerySuggest request runs (loading) then settles with no
    // suggestions for an unknown query.
    const { rerender } = renderHook((props) => useEffectiveQueryDriver(props), {
      initialProps: {
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: [] as string[],
        isLoadingSuggestions: true,
        typedQuery: 'xyz123',
        minChars: 3,
      },
    });

    expect(instantProducts.updateQuery).not.toHaveBeenCalled();

    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: [],
        isLoadingSuggestions: false,
        typedQuery: 'xyz123',
        minChars: 3,
      });
    });

    expect(instantProducts.updateQuery).toHaveBeenCalledWith('xyz123');
    expect(filterGen.filterSuggestions[0].updateQuery).toHaveBeenCalledWith('xyz123');
  });

  it('does NOT fire the typed-query fallback on a transient empty-suggestions render', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    // Settled: first suggestion "kayak" fired for typed "kay".
    const { rerender } = renderHook((props) => useEffectiveQueryDriver(props), {
      initialProps: {
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      },
    });
    await act(async () => {});
    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(instantProducts.updateQuery).toHaveBeenLastCalledWith('kayak');

    // User types another char ("kaya"). Coveo briefly emits suggestions=[]
    // WITHOUT the loading flag set yet (transient between requests). The typed
    // query "kaya" differs from the fired "kayak" — the fallback must NOT fire
    // here, otherwise it clears+refetches products for the partial "kaya".
    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: [],
        isLoadingSuggestions: false,
        typedQuery: 'kaya',
        minChars: 3,
      });
    });
    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(instantProducts.updateQuery).toHaveBeenLastCalledWith('kayak');

    // The request starts (loading) then settles with the same first suggestion.
    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: [],
        isLoadingSuggestions: true,
        typedQuery: 'kaya',
        minChars: 3,
      });
    });
    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kaya',
        minChars: 3,
      });
    });

    // First suggestion unchanged → dedup → still only one fire total, and it
    // was never called with the partial typed query.
    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(instantProducts.updateQuery).not.toHaveBeenCalledWith('kaya');
    expect(filterGen.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);
  });

  it('does not fire either controller below minChars', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    await act(async () => {
      renderHook(() =>
        useEffectiveQueryDriver({
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'ka',
          minChars: 3,
        })
      );
    });

    expect(instantProducts.updateQuery).not.toHaveBeenCalled();
    expect(filterGen.filterSuggestions[0].updateQuery).not.toHaveBeenCalled();
  });

  it('does not re-fire when effective query is unchanged across keystrokes', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    const { rerender } = renderHook(
      (props) => useEffectiveQueryDriver(props),
      {
        initialProps: {
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'kay',
          minChars: 3,
        },
      }
    );

    await act(async () => {});
    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);

    // User types more, same first suggestion
    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kaya',
        minChars: 3,
      });
    });

    expect(instantProducts.updateQuery).toHaveBeenCalledTimes(1);
    expect(filterGen.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);
  });

  it('exposes the effectiveQuery for commit-on-select', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    const { result } = renderHook(() =>
      useEffectiveQueryDriver({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      })
    );

    await act(async () => {});
    expect(result.current.effectiveQuery).toBe('kayak');
  });

  it('exposes meetsThreshold so the dropdown knows when to show filter/product columns', async () => {
    const instantProducts = createMockInstantProducts();
    const filterGen = createMockFilterSuggestionsGenerator(1);

    const { result, rerender } = renderHook(
      (props) => useEffectiveQueryDriver(props),
      {
        initialProps: {
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'ka',
          minChars: 3,
        },
      }
    );

    expect(result.current.meetsThreshold).toBe(false);

    await act(async () => {
      rerender({
        instantProductsController: instantProducts,
        filterSuggestionsGeneratorController: filterGen,
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      });
    });

    expect(result.current.meetsThreshold).toBe(true);
  });

  describe('committedQuery — the query the displayed products reflect', () => {
    it('exposes the committed query once a query fires', async () => {
      const instantProducts = createMockInstantProducts();
      const filterGen = createMockFilterSuggestionsGenerator(1);

      const { result } = renderHook(() =>
        useEffectiveQueryDriver({
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'kay',
          minChars: 3,
        })
      );

      await act(async () => {});
      expect(result.current.committedQuery).toBe('kayak');
    });

    it('holds the committed query stable while suggestions reload with the same first suggestion', async () => {
      const instantProducts = createMockInstantProducts();
      const filterGen = createMockFilterSuggestionsGenerator(1);

      const { result, rerender } = renderHook(
        (props) => useEffectiveQueryDriver(props),
        {
          initialProps: {
            instantProductsController: instantProducts,
            filterSuggestionsGeneratorController: filterGen,
            suggestions: ['kayak'],
            isLoadingSuggestions: false,
            typedQuery: 'kay',
            minChars: 3,
          },
        }
      );
      await act(async () => {});
      expect(result.current.committedQuery).toBe('kayak');

      // User types more; QuerySuggest reloads (loading) then settles with same first.
      await act(async () => {
        rerender({
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: true,
          typedQuery: 'kaya',
          minChars: 3,
        });
      });
      // Committed query must NOT change during loading — products haven't changed.
      expect(result.current.committedQuery).toBe('kayak');

      await act(async () => {
        rerender({
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'kaya',
          minChars: 3,
        });
      });
      expect(result.current.committedQuery).toBe('kayak');
    });

    it('resets the committed query below minChars', async () => {
      const instantProducts = createMockInstantProducts();
      const filterGen = createMockFilterSuggestionsGenerator(1);

      const { result, rerender } = renderHook(
        (props) => useEffectiveQueryDriver(props),
        {
          initialProps: {
            instantProductsController: instantProducts,
            filterSuggestionsGeneratorController: filterGen,
            suggestions: ['kayak'],
            isLoadingSuggestions: false,
            typedQuery: 'kay',
            minChars: 3,
          },
        }
      );
      await act(async () => {});
      expect(result.current.committedQuery).toBe('kayak');

      await act(async () => {
        rerender({
          instantProductsController: instantProducts,
          filterSuggestionsGeneratorController: filterGen,
          suggestions: ['kayak'],
          isLoadingSuggestions: false,
          typedQuery: 'ka',
          minChars: 3,
        });
      });
      expect(result.current.committedQuery).toBeNull();
    });
  });
});
