import { useEffect } from 'react';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  FilterSuggestionsGenerator,
  RegularFacetSearchResult,
} from '@coveo/headless/commerce';
import FilterSuggestionsGeneratorComponent from '../../filter-suggestions/filter-suggestions-generator.js';

export interface FilterSuggestionsColumnProps {
  controller: FilterSuggestionsGenerator;
  /** The committed Effective Query the filter suggestions should reflect (null = clear). */
  committedQuery: string | null;
  onSelect: (args: {
    controller: FilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => void;
}

/**
 * Self-contained Filter Suggestions column. Owns driving its own controllers off
 * the committed Effective Query (and clearing them when there is none), so the
 * whole feature can be removed by deleting this component and its one usage in the
 * dropdown — no shared hook or driver edits required.
 */
export default function FilterSuggestionsColumn(props: FilterSuggestionsColumnProps) {
  const { controller, committedQuery, onSelect } = props;

  useEffect(() => {
    const filters = controller.filterSuggestions;
    if (committedQuery) {
      filters.forEach((c) => c.updateQuery(committedQuery));
    } else {
      filters.forEach((c) => c.clear?.());
    }
  }, [committedQuery, controller]);

  return (
    <FilterSuggestionsGeneratorComponent
      controller={controller}
      onClickFilterSuggestion={onSelect}
    />
  );
}
