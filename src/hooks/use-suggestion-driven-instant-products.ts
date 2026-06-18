import { useEffect, useRef, useState } from 'react';
import type { Product } from '@coveo/headless/commerce';

/**
 * Options for the suggestion-driven Instant Products hook.
 */
export interface UseSuggestionDrivenInstantProductsOptions {
    /** Current products from the InstantProducts controller */
    products: Product[];
    /** Loading state from the InstantProducts controller */
    isLoading: boolean;
    /** Query suggestions for the current input; the first is the First Suggestion */
    suggestions: string[];
    /** Whether QuerySuggest is still loading suggestions for the current input */
    isLoadingSuggestions: boolean;
    /** The Typed Query (exact text the user entered) */
    typedQuery: string;
    /** Fires a ProductSuggest call for the given query */
    onQuery: (query: string) => void;
    /**
     * Minimum number of characters in the Typed Query before ProductSuggest fires.
     * Default: 3
     */
    minChars?: number;
}

/**
 * Return type for the suggestion-driven Instant Products hook.
 */
export interface UseSuggestionDrivenInstantProductsResult {
    /** Whether to show the "No results" message */
    shouldShowNoResults: boolean;
    /**
     * The First Suggestion to surface in a "Showing results for '<suggestion>'"
     * notice when it differs from the Typed Query (case-insensitive, trimmed),
     * otherwise null.
     */
    suggestionNotice: string | null;
}

/**
 * Drives the ProductSuggest (Instant Products) query from the First Suggestion.
 */
export function useSuggestionDrivenInstantProducts(
    options: UseSuggestionDrivenInstantProductsOptions
): UseSuggestionDrivenInstantProductsResult {
    const { products, isLoading, suggestions, isLoadingSuggestions, typedQuery, onQuery, minChars = 3 } = options;

    const desiredQuery = suggestions.length > 0 ? suggestions[0] : typedQuery;
    const hasProducts = products.length > 0;
    // The Typed Query must reach the threshold before either call is driven.
    const meetsThreshold = typedQuery.trim().length >= minChars;
    const lastFiredRef = useRef<string | null>(null);

    useEffect(() => {
        if (isLoadingSuggestions) {
            return;
        }
        if (!meetsThreshold) {
            return;
        }
        if (desiredQuery.trim().length === 0) {
            return;
        }
        if (desiredQuery === lastFiredRef.current) {
            return;
        }
        lastFiredRef.current = desiredQuery;
        onQuery(desiredQuery);
    }, [isLoadingSuggestions, meetsThreshold, desiredQuery, onQuery]);

    // The desired query whose ProductSuggest load we've actually observed start.
    // Gating on `isLoading` is what tells a settled query apart from one whose
    // load we never saw (so a late, empty render does not flash "No results").
    const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
    useEffect(() => {
        if (isLoading && desiredQuery.trim().length > 0) {
            setLoadingQuery(desiredQuery);
        }
    }, [isLoading, desiredQuery]);

    // The current desired query has settled once it finished the load we saw begin.
    const settled =
        meetsThreshold &&
        !isLoadingSuggestions &&
        !isLoading &&
        desiredQuery.trim().length > 0 &&
        desiredQuery === loadingQuery;

    // The First Suggestion is surfaced as a notice only when it differs from the
    // Typed Query under a case-insensitive, trimmed comparison, so trivial
    // differences (case or surrounding whitespace) do not surface a banner.
    const firstSuggestion = suggestions.length > 0 ? suggestions[0] : null;
    const normalize = (value: string) => value.trim().toLowerCase();
    const suggestionNotice =
        firstSuggestion !== null && normalize(firstSuggestion) !== normalize(typedQuery)
            ? firstSuggestion
            : null;

    return {
        shouldShowNoResults: settled && !hasProducts && suggestions.length === 0,
        suggestionNotice,
    };
}
