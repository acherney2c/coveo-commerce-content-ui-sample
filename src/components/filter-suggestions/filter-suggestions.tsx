import { useEffect, useState } from 'react';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  CategoryFilterSuggestionsState,
  FilterSuggestions as HeadlessFilterSuggestions,
  FilterSuggestionsState,
  RegularFacetSearchResult,
} from '@coveo/headless/commerce';

interface IFilterSuggestionsProps {
  controller: HeadlessFilterSuggestions | CategoryFilterSuggestions;
  onClickFilterSuggestion: (args: {
    controller: HeadlessFilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => void;
}

export default function FilterSuggestions(props: IFilterSuggestionsProps) {
  const { controller, onClickFilterSuggestion } = props;
  const [state, setState] = useState<
    FilterSuggestionsState | CategoryFilterSuggestionsState
  >(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const selectValue = (
    value: RegularFacetSearchResult | CategoryFacetSearchResult
  ) => {
    onClickFilterSuggestion({
      controller,
      value,
    });
  };

  return (
    <div className="mb-3">
      <div className="list-group shadow">
        <div className="list-group-item text-muted small">
          Filter Suggestions [<strong>{state.displayName}</strong>]
        </div>

        {state.values.length > 0 ? (
          state.values.map((item, index) => (
            <button
              key={index}
              type="button"
              className="list-group-item list-group-item-action"
              onClick={() => selectValue(item)}
            >
              {item.displayValue} ({item.count})
            </button>
          ))
        ) : (
          <div className="list-group-item">None</div>
        )}
      </div>
    </div>
  );
}
