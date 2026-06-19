import type {
  FilterSuggestionsGenerator,
  InstantProducts,
  SearchBoxState,
  Suggestion,
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  RegularFacetSearchResult,
} from '@coveo/headless/commerce';
import { useEffectiveQuery } from '../../hooks/use-effective-query.js';
import QuerySuggestionsColumn from './columns/query-suggestions-column.js';
import FilterSuggestionsColumn from './columns/filter-suggestions-column.js';
import InstantProductsColumn from './columns/instant-products-column.js';

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

  // Single owner of the Effective Query. Each column drives its own controller
  // off `committedQuery`, so the whole dropdown reflects one query (ADR 0003)
  // while each suggestion source stays self-contained and independently removable.
  const { meetsThreshold, committedQuery } = useEffectiveQuery({
    suggestions: state.suggestions.map((s) => s.rawValue),
    isLoadingSuggestions: state.isLoadingSuggestions,
    typedQuery: state.value,
    minChars,
  });

  if (!isOpen) return null;

  const hasSuggestions = state.suggestions.length > 0;
  // Content-gated: hide entirely on a settled-empty result (no flash through loading).
  if (!hasSuggestions && !state.isLoadingSuggestions) return null;

  return (
    <div className="position-relative mt-2">
      <div className="search-dropdown">
        <div className="row g-2">
          {/* Query Suggestions — always shown (ungated). */}
          <div className={meetsThreshold ? 'col-12 col-md-4' : 'col-12'}>
            <QuerySuggestionsColumn
              suggestions={state.suggestions}
              isLoading={state.isLoadingSuggestions}
              onSelect={onSelectSuggestion}
            />
          </div>

          {/* Filter Suggestions — delete this block + the column file to remove the feature. */}
          {meetsThreshold && (
            <div className="col-12 col-md-4">
              <FilterSuggestionsColumn
                controller={filterSuggestionsGeneratorController}
                committedQuery={committedQuery}
                onSelect={onSelectFilterSuggestion}
              />
            </div>
          )}

          {/* Instant Products — delete this block + the column file to remove the feature. */}
          {meetsThreshold && (
            <div className="col-12 col-md-4">
              <InstantProductsColumn
                controller={instantProductsController}
                committedQuery={committedQuery}
                typedQuery={state.value}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
