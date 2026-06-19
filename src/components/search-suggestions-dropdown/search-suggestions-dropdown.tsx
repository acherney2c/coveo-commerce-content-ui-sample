import { useEffect, useState } from 'react';
import type {
  FilterSuggestionsGenerator,
  InstantProducts,
  InstantProductsState,
  SearchBoxState,
  Suggestion,
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  RegularFacetSearchResult,
} from '@coveo/headless/commerce';
import { useEffectiveQueryDriver } from '../../hooks/use-effective-query-driver.js';
import InstantProductsComponent from '../instant-products/instant-products.js';
import FilterSuggestionsGeneratorComponent from '../filter-suggestions/filter-suggestions-generator.js';

export interface SearchSuggestionsDropdownProps {
  state: SearchBoxState;
  isOpen: boolean;
  minChars: number;
  filterSuggestionsGeneratorController: FilterSuggestionsGenerator;
  instantProductsController: InstantProducts;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onSelectFilterSuggestion: (args: {
    controller: FilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => void;
}

export default function SearchSuggestionsDropdown(props: SearchSuggestionsDropdownProps) {
  const {
    state,
    isOpen,
    minChars,
    filterSuggestionsGeneratorController,
    instantProductsController,
    onSelectSuggestion,
    onSelectFilterSuggestion,
  } = props;

  // Subscribe to instant products state
  const [ipState, setIpState] = useState<InstantProductsState>(instantProductsController.state);
  useEffect(() => {
    const unsubscribe = instantProductsController.subscribe(() => {
      setIpState(instantProductsController.state);
    });
    return () => unsubscribe();
  }, [instantProductsController]);

  // The generalized hook: sole caller of both controllers
  const { effectiveQuery, meetsThreshold, committedQuery } = useEffectiveQueryDriver({
    instantProductsController,
    filterSuggestionsGeneratorController,
    suggestions: state.suggestions.map((s) => s.rawValue),
    isLoadingSuggestions: state.isLoadingSuggestions,
    typedQuery: state.value,
    minChars,
  });

  if (!isOpen) return null;

  const hasSuggestions = state.suggestions.length > 0;
  const isLoadingSuggestions = state.isLoadingSuggestions;

  // Content-gated: if settled empty (no suggestions, not loading) hide entirely
  if (!hasSuggestions && !isLoadingSuggestions) return null;

  // Instant Products display is driven by the COMMITTED query (what the products
  // actually reflect), not the live suggestion-loading flag — so the product list
  // and notice don't flash on every keystroke while QuerySuggest reloads.
  const hasProducts = ipState.products.length > 0;
  const isCommitted = committedQuery !== null;
  // "No results" only once a query is committed and its product load has settled empty.
  const shouldShowNoResults = isCommitted && !ipState.isLoading && !hasProducts;

  // The notice reflects the committed query when it differs from what the user typed
  // (case-insensitive). Derived from committedQuery so it stays stable through loading.
  const normalize = (v: string) => v.trim().toLowerCase();
  const suggestionNotice =
    committedQuery && normalize(committedQuery) !== normalize(state.value)
      ? committedQuery
      : null;

  return (
    <div className="position-relative mt-2">
      <div className="search-dropdown">
        <div className="row g-2">
          {/* Query Suggestions — always shown (ungated) */}
          <div className={meetsThreshold ? 'col-12 col-md-4' : 'col-12'}>
            <div className="list-group shadow">
              <div className="list-group-item text-muted small">
                Query Suggestions
              </div>
              {state.suggestions.length > 0 ? (
                state.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.rawValue}
                    type="button"
                    className="list-group-item list-group-item-action"
                    title={suggestion.rawValue}
                    dangerouslySetInnerHTML={{
                      __html: suggestion.highlightedValue,
                    }}
                    onClick={() => onSelectSuggestion(suggestion)}
                  />
                ))
              ) : (
                <div className="list-group-item text-muted">
                  {isLoadingSuggestions ? 'Loading...' : 'None'}
                </div>
              )}
            </div>
          </div>

          {/* Filter Suggestions — gated by meetsThreshold from hook */}
          {meetsThreshold && (
            <div className="col-12 col-md-4">
              <FilterSuggestionsGeneratorComponent
                controller={filterSuggestionsGeneratorController}
                onClickFilterSuggestion={onSelectFilterSuggestion}
              />
            </div>
          )}

          {/* Instant Products — gated by meetsThreshold from hook */}
          {meetsThreshold && (
            <div className="col-12 col-md-4">
              <InstantProductsComponent
                controller={instantProductsController}
                products={ipState.products}
                isLoading={ipState.isLoading}
                effectiveQuery={committedQuery ?? effectiveQuery}
                suggestionNotice={suggestionNotice}
                shouldShowNoResults={shouldShowNoResults}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
