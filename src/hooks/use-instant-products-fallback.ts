import { useEffect, useState } from 'react';
import type { Product } from '@coveo/headless/commerce';

/**
 * Options for the InstantProducts fallback hook.
 */
export interface UseInstantProductsFallbackOptions {
    /** Current products from the InstantProducts controller */
    products: Product[];
    /** Loading state from the InstantProducts controller */
    isLoading: boolean;
    /** Query suggestions to use for fallback */
    suggestions: string[];
    /** The current query being searched */
    currentQuery: string;
    /** Callback when fallback is triggered */
    onFallback: (suggestion: string) => void;
}

/**
 * Return type for the InstantProducts fallback hook.
 */
export interface UseInstantProductsFallbackResult {
    /** Whether to show the "No results" message */
    shouldShowNoResults: boolean;
    /** The correction/fallback query that was used */
    correctionQuery: string | null;
    /** Whether we're currently showing results from a fallback query */
    isShowingFallback: boolean;
    /** The original query that had no results */
    originalQuery: string | null;
}

/**
 * Hook that handles the "fallback to suggestions" logic for InstantProducts.
 *
 * ## The Problem
 * When InstantProducts are used with QuerySuggestions, `isLoading` can become
 * `false` before `products` is populated, and `currentQuery` can change after a
 * previous query finished loading (the user is still typing). Naively checking
 * `!isLoading && products.length === 0` fires a fallback in both cases.
 *
 * ## The Solution
 * - `loadingQuery` records the query we've actually seen loading, so a query is
 *   only "settled" once it finishes the load we observed start.
 * - The fallback fires on a microtask that cancels itself if products arrive or
 *   the query changes in the same tick — so a late-arriving product set wins.
 *
 * @example
 * ```tsx
 * const { shouldShowNoResults, isShowingFallback, originalQuery, correctionQuery } =
 *   useInstantProductsFallback({
 *     products: state.products,
 *     isLoading: state.isLoading,
 *     suggestions: querySuggestions,
 *     currentQuery: searchBoxState.value,
 *     onFallback: (suggestion) => controller.updateQuery(suggestion),
 *   });
 * ```
 */
export function useInstantProductsFallback(
    options: UseInstantProductsFallbackOptions
): UseInstantProductsFallbackResult {
    const { products, isLoading, suggestions, currentQuery, onFallback } = options;
    const hasProducts = products.length > 0;
    const hasQuery = currentQuery.trim().length > 0;

    // The query whose load we've actually observed start. Gating on `isLoading`
    // is what tells a settled query apart from one that changed after loading.
    const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
    useEffect(() => {
        if (isLoading && hasQuery) {
            setLoadingQuery(currentQuery);
        }
    }, [isLoading, currentQuery, hasQuery]);

    // The applied fallback, kept until the user moves to a genuinely new query.
    const [fallback, setFallback] = useState<{ original: string; correction: string } | null>(null);
    useEffect(() => {
        setFallback((fb) =>
            fb && currentQuery !== fb.original && currentQuery !== fb.correction ? null : fb
        );
    }, [currentQuery]);

    // The current query has settled once it finished the load we saw begin.
    const settled = !isLoading && hasQuery && currentQuery === loadingQuery;

    // Fire once per settled-empty query, deferred so a late product set or a
    // further keystroke can cancel it first.
    const shouldTrigger =
        settled && !hasProducts && suggestions.length > 0 && fallback?.original !== currentQuery;
    useEffect(() => {
        if (!shouldTrigger) {
            return;
        }
        const original = currentQuery;
        const correction = suggestions[0];
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) {
                return;
            }
            setFallback({ original, correction });
            onFallback(correction);
        });
        return () => {
            cancelled = true;
        };
    }, [shouldTrigger, suggestions, currentQuery, onFallback]);

    const isShowingFallback = fallback !== null && hasProducts;

    return {
        shouldShowNoResults: settled && !hasProducts && suggestions.length === 0,
        correctionQuery: isShowingFallback ? fallback.correction : null,
        isShowingFallback,
        originalQuery: isShowingFallback ? fallback.original : null,
    };
}
