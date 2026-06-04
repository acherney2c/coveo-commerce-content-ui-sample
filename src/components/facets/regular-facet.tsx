import { useEffect, useRef, useState } from 'react';
import type {
  RegularFacet as HeadlessRegularFacet,
  RegularFacetSearchResult,
  RegularFacetState,
  RegularFacetValue,
} from '@coveo/headless/commerce';

interface IRegularFacetProps {
  controller: HeadlessRegularFacet;
}

export default function RegularFacet(props: IRegularFacetProps) {
  const { controller } = props;
  const [state, setState] = useState<RegularFacetState>(controller.state);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const handleSearchChange = (value: string) => {
    if (value === '') {
      setShowSearchResults(false);
      controller.facetSearch.clear();
      return;
    }

    controller.facetSearch.updateText(value);
    controller.facetSearch.search();
    setShowSearchResults(true);
  };

  const clearSearch = () => {
    setShowSearchResults(false);
    controller.facetSearch.clear();
    searchInputRef.current?.focus();
  };

  const clearSelected = () => {
    controller.deselectAll();
    searchInputRef.current?.focus();
  };

  const selectSearchResult = (value: RegularFacetSearchResult) => {
    controller.facetSearch.select(value);
    controller.facetSearch.clear();
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  const selectFacetValue = (value: RegularFacetValue) => {
    controller.toggleSelect(value);
  };

  const highlightSearchResult = (value: string): string => {
    const query = state.facetSearch.query;
    if (!query) return value.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return value.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
      .replace(regex, '<mark>$1</mark>');
  };

  return (
    <div className="card small mb-3">
      <div className="card-header">
        {state.displayName ?? state.facetId}
      </div>
      <div className="card-body p-0">
        <div className="input-group">
          <input
            ref={searchInputRef}
            className="form-control ps-3 border-0 rounded-0"
            name="query"
            type="text"
            placeholder="Search facet..."
            disabled={state.isLoading}
            value={state.facetSearch.query}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <button
            className="btn btn-light btn-sm border-start rounded-0"
            type="reset"
            disabled={state.isLoading || state.facetSearch.query === ''}
            onClick={clearSearch}
          >
            Clear
          </button>
        </div>
      </div>
      <ul className="list-group list-group-flush">
        {state.isLoading || state.facetSearch.isLoading ? (
          <li className="list-group-item text-muted">Loading...</li>
        ) : showSearchResults ? (
          state.facetSearch.values.length > 0 ? (
            state.facetSearch.values.map((item) => (
              <li key={item.rawValue} className="list-group-item list-group-item-action">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  id={`${state.facetId}-${item.rawValue}-facet-value`}
                  disabled={state.isLoading}
                  onChange={() => selectSearchResult(item)}
                />
                <label
                  className="form-check-label stretched-link"
                  htmlFor={`${state.facetId}-${item.rawValue}-facet-value`}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchResult(item.displayValue),
                    }}
                  />
                  <span className="badge text-bg-light rounded-pill ms-2">
                    {item.count}
                  </span>
                </label>
              </li>
            ))
          ) : (
            <li className="list-group-item text-muted">
              No results for <strong>{state.facetSearch.query}</strong>
            </li>
          )
        ) : (
          <>
            {state.hasActiveValues && (
              <li className="list-group-item p-0">
                <button
                  className="btn btn-light btn-sm rounded-0 w-100"
                  type="reset"
                  disabled={state.isLoading}
                  onClick={clearSelected}
                >
                  Reset Selected
                </button>
              </li>
            )}

            {state.values.map((item) => (
              <li key={item.value} className="list-group-item list-group-item-action">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  id={`${state.facetId}-${item.value}-facet-value`}
                  disabled={state.isLoading}
                  checked={item.state !== 'idle'}
                  onChange={() => selectFacetValue(item)}
                />
                <label
                  className="form-check-label stretched-link"
                  htmlFor={`${state.facetId}-${item.value}-facet-value`}
                >
                  {item.value}
                  <span className="badge text-bg-light rounded-pill ms-2">
                    {item.numberOfResults}
                  </span>
                </label>
              </li>
            ))}

            {state.canShowLessValues && (
              <li className="list-group-item p-0">
                <button
                  className="btn btn-light btn-sm w-100"
                  type="button"
                  disabled={state.isLoading}
                  onClick={() => controller.showLessValues()}
                >
                  Show Less
                </button>
              </li>
            )}

            {state.canShowMoreValues && (
              <li className="list-group-item p-0">
                <button
                  className="btn btn-light btn-sm w-100"
                  type="button"
                  disabled={state.isLoading}
                  onClick={() => controller.showMoreValues()}
                >
                  Show More
                </button>
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  );
}
