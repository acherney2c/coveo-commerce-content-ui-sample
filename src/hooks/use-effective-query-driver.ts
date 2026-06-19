import { useLayoutEffect, useRef, useState } from 'react';
import type { InstantProducts, FilterSuggestionsGenerator } from '@coveo/headless/commerce';

export interface UseEffectiveQueryDriverOptions {
  instantProductsController: InstantProducts;
  filterSuggestionsGeneratorController: FilterSuggestionsGenerator;
  /** Query suggestions; first element is the First Suggestion */
  suggestions: string[];
  /** Whether QuerySuggest is still loading */
  isLoadingSuggestions: boolean;
  /** The exact text the user typed */
  typedQuery: string;
  /** Minimum characters before controllers fire. Default: 3 */
  minChars?: number;
}

export interface UseEffectiveQueryDriverResult {
  /** The Effective Query (First Suggestion ?? Typed Query), trimmed */
  effectiveQuery: string;
  /** Whether the typed query meets the minChars threshold */
  meetsThreshold: boolean;
  /**
   * The query the currently-displayed products/filters actually reflect (the last
   * query fired), or null if nothing has been committed. Stable through QuerySuggest
   * reloads — only changes when a new query is actually driven — so the UI can show
   * a flicker-free "Showing results for" notice and product list.
   */
  committedQuery: string | null;
}

/**
 * Sole caller of both instantProducts.updateQuery and filterSuggestions.updateQuery.
 * Derives the Effective Query (First Suggestion when available, otherwise Typed Query),
 * waits for suggestions to settle, respects minChars, and deduplicates.
 */
export function useEffectiveQueryDriver(
  options: UseEffectiveQueryDriverOptions
): UseEffectiveQueryDriverResult {
  const { instantProductsController, filterSuggestionsGeneratorController, suggestions, isLoadingSuggestions, typedQuery, minChars = 3 } = options;

  const firstSuggestion = suggestions.length > 0 ? suggestions[0].trim() : null;
  const trimmedTyped = typedQuery.trim();
  const effectiveQuery = firstSuggestion ?? trimmedTyped;
  const meetsThreshold = trimmedTyped.length >= minChars;
  const lastFiredRef = useRef<string | null>(null);
  // The committed query is exposed for rendering so the notice / product list
  // track what the products actually reflect, not the live suggestion-loading flag.
  const [committedQuery, setCommittedQuery] = useState<string | null>(null);
  // Tracks the previous loading flag so we can detect a genuine settle edge
  // (loading → not-loading) and distinguish it from a transient empty-suggestion
  // render that occurs between QuerySuggest requests.
  const prevLoadingRef = useRef(isLoadingSuggestions);

  useLayoutEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoadingSuggestions;

    if (!meetsThreshold) {
      lastFiredRef.current = null;
      setCommittedQuery(null);
      return;
    }
    if (isLoadingSuggestions) {
      return;
    }

    // Decide what (if anything) to drive:
    // - Suggestions present → trust the First Suggestion (definitive for this input).
    // - No suggestions but we just settled (was loading) → genuine empty, fall back
    //   to the Typed Query.
    // - No suggestions and NOT a settle edge → transient churn between requests;
    //   hold the previous query rather than firing the partial Typed Query.
    let queryToFire: string | null;
    if (firstSuggestion) {
      queryToFire = firstSuggestion;
    } else if (wasLoading) {
      queryToFire = trimmedTyped;
    } else {
      return;
    }

    if (queryToFire.length === 0 || queryToFire === lastFiredRef.current) {
      return;
    }
    lastFiredRef.current = queryToFire;
    setCommittedQuery(queryToFire);
    instantProductsController.updateQuery(queryToFire);
    filterSuggestionsGeneratorController.filterSuggestions.forEach((c) => {
      c.updateQuery(queryToFire);
    });
  }, [isLoadingSuggestions, meetsThreshold, firstSuggestion, trimmedTyped, instantProductsController, filterSuggestionsGeneratorController]);

  return { effectiveQuery, meetsThreshold, committedQuery };
}
