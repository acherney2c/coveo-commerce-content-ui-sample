import { useEffect, useState } from 'react';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions as HeadlessFilterSuggestions,
  FilterSuggestionsGenerator as HeadlessFilterSuggestionsGenerator,
  GeneratedFilterSuggestionsControllers,
  RegularFacetSearchResult,
} from '@coveo/headless/commerce';
import FilterSuggestions from './filter-suggestions.js';

interface IFilterSuggestionsGeneratorProps {
  controller: HeadlessFilterSuggestionsGenerator;
  onClickFilterSuggestion: (args: {
    controller: HeadlessFilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => void;
}

export default function FilterSuggestionsGenerator(
  props: IFilterSuggestionsGeneratorProps
) {
  const { controller, onClickFilterSuggestion } = props;
  const [filterSuggestions, setFilterSuggestions] =
    useState<GeneratedFilterSuggestionsControllers>(
      controller.filterSuggestions
    );

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setFilterSuggestions(controller.filterSuggestions);
    });
    return () => unsubscribe();
  }, [controller]);

  if (filterSuggestions.length > 0) {
    return (
      <>
        {filterSuggestions.map((filterController) => (
          <FilterSuggestions
            key={filterController.state.facetId}
            controller={filterController}
            onClickFilterSuggestion={onClickFilterSuggestion}
          />
        ))}
      </>
    );
  }

  return (
    <div className="list-group shadow">
      <div className="list-group-item text-muted small">Filter Suggestions</div>
      <div className="list-group-item">None</div>
    </div>
  );
}
