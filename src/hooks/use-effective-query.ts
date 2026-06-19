import { useLayoutEffect, useRef, useState } from 'react';

export interface UseEffectiveQueryOptions {
  /** Query suggestions; first element is the First Suggestion */
  suggestions: string[];
  /** Whether QuerySuggest is still loading */
  isLoadingSuggestions: boolean;
  /** The exact text the user typed */
  typedQuery: string;
  /** Minimum characters before a query is committed. Default: 3 */
  minChars?: number;
}

export interface UseEffectiveQueryResult {
  /** The Effective Query (First Suggestion ?? Typed Query), trimmed. Live value. */
  effectiveQuery: string;
  /** Whether the typed query meets the minChars threshold */
  meetsThreshold: boolean;
  /**
   * The settled, deduplicated query that suggestion sources should drive off of.
   * Advances only when a genuinely new query settles (so consumers fire once per
   * real change) and holds stable through QuerySuggest reloads and transient
   * empty-suggestion renders. Null until the first commit / below threshold.
   */
  committedQuery: string | null;
}

/**
 * Owns the Effective Query decision for the suggestion dropdown: derives it
 * (First Suggestion when available, otherwise the Typed Query), waits for
 * QuerySuggest to settle, respects minChars, and deduplicates — exposing a single
 * `committedQuery` that every suggestion source drives off of, so the whole
 * dropdown reflects one query (ADR 0003).
 *
 * This hook does not touch any controller. Each source (Filter Suggestions,
 * Instant Products) drives its own controller off `committedQuery`, which keeps
 * each source self-contained and independently removable.
 */
export function useEffectiveQuery(
  options: UseEffectiveQueryOptions
): UseEffectiveQueryResult {
  const { suggestions, isLoadingSuggestions, typedQuery, minChars = 3 } = options;

  const firstSuggestion = suggestions.length > 0 ? suggestions[0].trim() : null;
  const trimmedTyped = typedQuery.trim();
  const effectiveQuery = firstSuggestion ?? trimmedTyped;
  const meetsThreshold = trimmedTyped.length >= minChars;

  const [committedQuery, setCommittedQuery] = useState<string | null>(null);
  // Detects a genuine settle edge (loading → not-loading) so a transient
  // empty-suggestion render between requests does not commit the partial typed query.
  const prevLoadingRef = useRef(isLoadingSuggestions);

  useLayoutEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoadingSuggestions;

    if (!meetsThreshold) {
      setCommittedQuery(null);
      return;
    }
    if (isLoadingSuggestions) {
      return;
    }

    // - Suggestions present → trust the First Suggestion (definitive for this input).
    // - No suggestions but we just settled (was loading) → genuine empty, fall back
    //   to the Typed Query.
    // - No suggestions and NOT a settle edge → transient churn; hold the prior commit.
    let next: string | null;
    if (firstSuggestion) {
      next = firstSuggestion;
    } else if (wasLoading) {
      next = trimmedTyped;
    } else {
      return;
    }

    if (next.length === 0) {
      return;
    }
    // Dedup: only advance when the settled query actually changes.
    setCommittedQuery((prev) => (prev === next ? prev : next));
  }, [isLoadingSuggestions, meetsThreshold, firstSuggestion, trimmedTyped]);

  return { effectiveQuery, meetsThreshold, committedQuery };
}
