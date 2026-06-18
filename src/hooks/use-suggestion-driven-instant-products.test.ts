import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSuggestionDrivenInstantProducts } from './use-suggestion-driven-instant-products.js';
import type { Product } from '@coveo/headless/commerce';

const mockProduct = {
  permanentid: 'test-123',
  ec_name: 'Test Product',
  ec_product_id: 'PROD-123',
  additionalFields: {},
  children: [],
  totalNumberOfChildren: 0,
} as unknown as Product;

describe('useSuggestionDrivenInstantProducts', () => {
  it('queries ProductSuggest with the first suggestion once QuerySuggest settles', async () => {
    const onQuery = vi.fn();

    const { rerender } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [] as Product[],
          isLoading: false,
          suggestions: ['drill bit', 'drill press'],
          isLoadingSuggestions: true,
          typedQuery: 'drill',
          onQuery,
        },
      }
    );

    // Still loading suggestions: must not fire yet.
    expect(onQuery).not.toHaveBeenCalled();

    // QuerySuggest settles for the current input.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit', 'drill press'],
        isLoadingSuggestions: false,
        typedQuery: 'drill',
        onQuery,
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('drill bit');
  });

  it('falls back to the typed query when there are no suggestions', async () => {
    const onQuery = vi.fn();

    await act(async () => {
      renderHook((props) => useSuggestionDrivenInstantProducts(props), {
        initialProps: {
          products: [] as Product[],
          isLoading: false,
          suggestions: [],
          isLoadingSuggestions: false,
          typedQuery: 'xyz123unknown',
          onQuery,
        },
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('xyz123unknown');
  });

  it('does not re-fire when the desired query is unchanged across keystrokes', async () => {
    const onQuery = vi.fn();

    const { rerender } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [] as Product[],
          isLoading: false,
          suggestions: ['drill bit'],
          isLoadingSuggestions: false,
          typedQuery: 'dr',
          onQuery,
        },
      }
    );

    // User types another character; QuerySuggest re-runs and settles with the
    // same First Suggestion. Desired query is unchanged, so no new fire.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: true,
        typedQuery: 'dri',
        onQuery,
      });
    });
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: false,
        typedQuery: 'dri',
        onQuery,
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('drill bit');

    // User types yet another character; QuerySuggest re-runs and settles again
    // with the same First Suggestion. The dedup ref must block a second fire.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: true,
        typedQuery: 'dril',
        onQuery,
      });
    });
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: false,
        typedQuery: 'dril',
        onQuery,
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('drill bit');
  });

  it('shows "No results" only once the typed-query load settles empty with no suggestions', async () => {
    const onQuery = vi.fn();

    const { result, rerender } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [] as Product[],
          isLoading: true,
          suggestions: [],
          isLoadingSuggestions: false,
          typedQuery: 'xyz123unknown',
          onQuery,
        },
      }
    );

    // Still loading the Instant Products: no "No results" yet.
    await act(async () => {});
    expect(result.current.shouldShowNoResults).toBe(false);

    // Load settles with no products and no suggestions to fall back to.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: [],
        isLoadingSuggestions: false,
        typedQuery: 'xyz123unknown',
        onQuery,
      });
    });

    expect(result.current.shouldShowNoResults).toBe(true);
  });

  it('does not show "No results" when products are present', async () => {
    const onQuery = vi.fn();

    const { result } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [mockProduct],
          isLoading: false,
          suggestions: [],
          isLoadingSuggestions: false,
          typedQuery: 'test',
          onQuery,
        },
      }
    );

    await act(async () => {});
    expect(result.current.shouldShowNoResults).toBe(false);
  });

  describe('Showing-results-for notice', () => {
    it('exposes the first suggestion when it differs from the typed query', async () => {
      const onQuery = vi.fn();

      const { result } = renderHook(
        (props) => useSuggestionDrivenInstantProducts(props),
        {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: ['drill bit'],
            isLoadingSuggestions: false,
            typedQuery: 'drill',
            onQuery,
          },
        }
      );

      await act(async () => {});
      expect(result.current.suggestionNotice).toBe('drill bit');
    });

    it('shows no notice when the first suggestion is trivially equal (case or whitespace)', async () => {
      const onQuery = vi.fn();

      const { result, rerender } = renderHook(
        (props) => useSuggestionDrivenInstantProducts(props),
        {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: ['Drill'],
            isLoadingSuggestions: false,
            typedQuery: 'drill',
            onQuery,
          },
        }
      );

      await act(async () => {});
      expect(result.current.suggestionNotice).toBeNull();

      await act(async () => {
        rerender({
          products: [],
          isLoading: false,
          suggestions: ['drill '],
          isLoadingSuggestions: false,
          typedQuery: 'drill',
          onQuery,
        });
      });
      expect(result.current.suggestionNotice).toBeNull();
    });

    it('shows no notice when there are no suggestions', async () => {
      const onQuery = vi.fn();

      const { result } = renderHook(
        (props) => useSuggestionDrivenInstantProducts(props),
        {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: [],
            isLoadingSuggestions: false,
            typedQuery: 'drill',
            onQuery,
          },
        }
      );

      await act(async () => {});
      expect(result.current.suggestionNotice).toBeNull();
    });
  });

  describe('Minimum-character threshold', () => {
    it('does not fire ProductSuggest while the typed query is below the default threshold', async () => {
      const onQuery = vi.fn();

      await act(async () => {
        renderHook((props) => useSuggestionDrivenInstantProducts(props), {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: ['drill'],
            isLoadingSuggestions: false,
            typedQuery: 'dr',
            onQuery,
          },
        });
      });

      expect(onQuery).not.toHaveBeenCalled();
    });

    it('fires ProductSuggest once the typed query reaches the threshold', async () => {
      const onQuery = vi.fn();

      await act(async () => {
        renderHook((props) => useSuggestionDrivenInstantProducts(props), {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: ['drill'],
            isLoadingSuggestions: false,
            typedQuery: 'dri',
            onQuery,
          },
        });
      });

      expect(onQuery).toHaveBeenCalledTimes(1);
      expect(onQuery).toHaveBeenCalledWith('drill');
    });

    it('honours a configurable threshold', async () => {
      const onQuery = vi.fn();

      await act(async () => {
        renderHook((props) => useSuggestionDrivenInstantProducts(props), {
          initialProps: {
            products: [] as Product[],
            isLoading: false,
            suggestions: ['drill'],
            isLoadingSuggestions: false,
            typedQuery: 'dr',
            onQuery,
            minChars: 2,
          },
        });
      });

      expect(onQuery).toHaveBeenCalledTimes(1);
      expect(onQuery).toHaveBeenCalledWith('drill');
    });

    it('does not show "No results" while below the threshold', async () => {
      const onQuery = vi.fn();

      const { result, rerender } = renderHook(
        (props) => useSuggestionDrivenInstantProducts(props),
        {
          initialProps: {
            products: [] as Product[],
            isLoading: true,
            suggestions: [],
            isLoadingSuggestions: false,
            typedQuery: 'dr',
            onQuery,
          },
        }
      );

      await act(async () => {
        rerender({
          products: [],
          isLoading: false,
          suggestions: [],
          isLoadingSuggestions: false,
          typedQuery: 'dr',
          onQuery,
        });
      });

      expect(result.current.shouldShowNoResults).toBe(false);
    });
  });

  it('re-fires onQuery after dropping below the threshold and re-typing the same query', async () => {
    const onQuery = vi.fn();

    const { rerender } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [] as Product[],
          isLoading: false,
          suggestions: ['drill bit'],
          isLoadingSuggestions: false,
          typedQuery: 'drill',
          onQuery,
        },
      }
    );

    await act(async () => {});
    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('drill bit');

    // User drops below the threshold; lastFiredRef should reset.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: false,
        typedQuery: 'dr',
        onQuery,
      });
    });

    // User re-types the same query: onQuery should fire again.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: false,
        typedQuery: 'drill',
        onQuery,
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(2);
  });

  it('fires ProductSuggest again after dropping below threshold while suggestions are loading', async () => {
    const onQuery = vi.fn();

    const { rerender } = renderHook(
      (props) => useSuggestionDrivenInstantProducts(props),
      {
        initialProps: {
          products: [] as Product[],
          isLoading: false,
          suggestions: ['drill bit'],
          isLoadingSuggestions: false,
          typedQuery: 'drill',
          onQuery,
        },
      }
    );

    await act(async () => {});
    expect(onQuery).toHaveBeenCalledTimes(1);
    expect(onQuery).toHaveBeenCalledWith('drill bit');

    // User backspaces below the threshold while suggestions are still loading;
    // lastFiredRef must reset even though isLoadingSuggestions is true.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: true,
        typedQuery: 'dr',
        onQuery,
      });
    });

    // User re-types the same query: onQuery should fire again.
    await act(async () => {
      rerender({
        products: [],
        isLoading: false,
        suggestions: ['drill bit'],
        isLoadingSuggestions: false,
        typedQuery: 'drill',
        onQuery,
      });
    });

    expect(onQuery).toHaveBeenCalledTimes(2);
  });
});
