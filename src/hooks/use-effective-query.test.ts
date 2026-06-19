import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffectiveQuery } from './use-effective-query.js';

describe('useEffectiveQuery', () => {
  it('commits the First Suggestion once QuerySuggest settles', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: ['kayak', 'tandem kayak'],
        isLoadingSuggestions: true,
        typedQuery: 'kay',
        minChars: 3,
      },
    });

    // While loading, nothing is committed yet.
    expect(result.current.committedQuery).toBeNull();

    await act(async () => {
      rerender({
        suggestions: ['kayak', 'tandem kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      });
    });

    expect(result.current.committedQuery).toBe('kayak');
    expect(result.current.effectiveQuery).toBe('kayak');
  });

  it('falls back to the typed query when no suggestions settle empty', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: [] as string[],
        isLoadingSuggestions: true,
        typedQuery: 'xyz123',
        minChars: 3,
      },
    });

    expect(result.current.committedQuery).toBeNull();

    await act(async () => {
      rerender({
        suggestions: [],
        isLoadingSuggestions: false,
        typedQuery: 'xyz123',
        minChars: 3,
      });
    });

    expect(result.current.committedQuery).toBe('xyz123');
  });

  it('does NOT commit the typed-query fallback on a transient empty-suggestions render', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      },
    });
    await act(async () => {});
    expect(result.current.committedQuery).toBe('kayak');

    // User types another char ("kaya"); suggestions briefly empty WITHOUT the
    // loading flag (transient between requests). Committed query must hold.
    await act(async () => {
      rerender({
        suggestions: [],
        isLoadingSuggestions: false,
        typedQuery: 'kaya',
        minChars: 3,
      });
    });
    expect(result.current.committedQuery).toBe('kayak');

    // Request runs then settles with the same first suggestion.
    await act(async () => {
      rerender({ suggestions: [], isLoadingSuggestions: true, typedQuery: 'kaya', minChars: 3 });
    });
    await act(async () => {
      rerender({ suggestions: ['kayak'], isLoadingSuggestions: false, typedQuery: 'kaya', minChars: 3 });
    });
    expect(result.current.committedQuery).toBe('kayak');
  });

  it('does not commit below minChars and resets a prior commit', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      },
    });
    await act(async () => {});
    expect(result.current.committedQuery).toBe('kayak');

    await act(async () => {
      rerender({ suggestions: ['kayak'], isLoadingSuggestions: false, typedQuery: 'ka', minChars: 3 });
    });
    expect(result.current.committedQuery).toBeNull();
    expect(result.current.meetsThreshold).toBe(false);
  });

  it('does not advance the committed query when the first suggestion is unchanged', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'kay',
        minChars: 3,
      },
    });
    await act(async () => {});
    expect(result.current.committedQuery).toBe('kayak');

    await act(async () => {
      rerender({ suggestions: ['kayak'], isLoadingSuggestions: false, typedQuery: 'kaya', minChars: 3 });
    });
    // Same first suggestion → committed query is the same reference value.
    expect(result.current.committedQuery).toBe('kayak');
  });

  it('exposes meetsThreshold for column gating', async () => {
    const { result, rerender } = renderHook((props) => useEffectiveQuery(props), {
      initialProps: {
        suggestions: ['kayak'],
        isLoadingSuggestions: false,
        typedQuery: 'ka',
        minChars: 3,
      },
    });
    expect(result.current.meetsThreshold).toBe(false);

    await act(async () => {
      rerender({ suggestions: ['kayak'], isLoadingSuggestions: false, typedQuery: 'kay', minChars: 3 });
    });
    expect(result.current.meetsThreshold).toBe(true);
  });
});
