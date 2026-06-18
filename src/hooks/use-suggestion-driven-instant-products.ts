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
  /** The trimmed desired query. Reflects the current input regardless of whether a
   *  ProductSuggest call has been fired (i.e. also returned when below threshold or
   *  while suggestions are loading). Use for display in 'No results found for…' messages. */
  effectiveQuery: string;
}

/**
 * Drives the ProductSuggest (Instant Products) query from the First Suggestion.
 */
export function useSuggestionDrivenInstantProducts(
  options: UseSuggestionDrivenInstantProductsOptions
): UseSuggestionDrivenInstantProductsResult {
  const { products, isLoading, suggestions, isLoadingSuggestions, typedQuery, onQuery, minChars = 3 } = options;

  const desiredQuery = suggestions.length > 0 ? suggestions[0] : typedQuery;
  const trimmedDesiredQuery = desiredQuery.trim();
  const hasProducts = products.length > 0;
  // The Typed Query must reach the threshold before either call is driven.
  const meetsThreshold = typedQuery.trim().length >= minChars;
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!meetsThreshold) {
      // Reset so re-entering the same query after dropping below the threshold
      // (or clearing) fires onQuery again instead of being deduplicated.
      lastFiredRef.current = null;
      return;
    }
    if (isLoadingSuggestions) {
      return;
    }
    if (trimmedDesiredQuery.length === 0) {
      return;
    }
    if (trimmedDesiredQuery === lastFiredRef.current) {
      return;
    }
    lastFiredRef.current = trimmedDesiredQuery;
    onQuery(trimmedDesiredQuery);
  }, [isLoadingSuggestions, meetsThreshold, desiredQuery, onQuery]);

  // The desired query whose ProductSuggest load we've actually observed start.
  // Gating on `isLoading` is what tells a settled query apart from one whose
  // load we never saw (so a late, empty render does not flash "No results").
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const prevIsLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current && trimmedDesiredQuery.length > 0) {
      setLoadingQuery(trimmedDesiredQuery);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, trimmedDesiredQuery]);

  // The current desired query has settled once it finished the load we saw begin.
  const settled =
    meetsThreshold &&
    !isLoadingSuggestions &&
    !isLoading &&
    trimmedDesiredQuery.length > 0 &&
    trimmedDesiredQuery === loadingQuery;

  // The First Suggestion is surfaced as a notice only when it differs from the
  // Typed Query under a case-insensitive, trimmed comparison, so trivial
  // differences (case or surrounding whitespace) do not surface a banner.
  // Suppressed while suggestions are still loading or below the threshold so a
  // stale suggestion does not flash a "Showing results for…" banner mid-typing.
  const firstSuggestion = suggestions.length > 0 ? suggestions[0] : null;
  const normalize = (value: string) => value.trim().toLowerCase();
  const suggestionNotice =
    !isLoadingSuggestions &&
    meetsThreshold &&
    firstSuggestion !== null &&
    normalize(firstSuggestion) !== normalize(typedQuery)
      ? firstSuggestion
      : null;

  return {
    shouldShowNoResults: settled && !hasProducts,
    suggestionNotice,
    effectiveQuery: trimmedDesiredQuery,
  };
}
