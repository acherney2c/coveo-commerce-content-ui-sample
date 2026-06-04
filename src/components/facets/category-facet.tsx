import { useEffect, useRef, useState } from 'react';
import type {
  CategoryFacet as HeadlessCategoryFacet,
  CategoryFacetSearchResult,
  CategoryFacetState,
  CategoryFacetValue,
} from '@coveo/headless/commerce';

interface ICategoryFacetProps {
  controller: HeadlessCategoryFacet;
}

export default function CategoryFacet(props: ICategoryFacetProps) {
  const { controller } = props;
  const [state, setState] = useState<CategoryFacetState>(controller.state);
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

  const selectSearchResult = (value: CategoryFacetSearchResult) => {
    controller.facetSearch.select(value);
    controller.facetSearch.clear();
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  const selectFacetValue = (value: CategoryFacetValue) => {
    if (controller.isValueSelected(value)) {
      controller.deselectAll();
      return;
    }
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

  const showLess = () => {
    controller.showLessValues();
  };

  const showMore = () => {
    controller.showMoreValues();
  };

  const ancestry = state.selectedValueAncestry || [];
  const activeValueChildren = ancestry.length > 0 ? ancestry[ancestry.length - 1]?.children ?? [] : [];

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
                  {item.path.length > 0 && (
                    <small className="ps-1">in {item.path.join(' > ')}</small>
                  )}
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

            {state.hasActiveValues ? (
              <>
                <li className="list-group-item p-0">
                  <ul className="list-group list-group-flush">
                    {ancestry.map((item, index) => (
                      <li 
                        key={item.value} 
                        className="list-group-item list-group-item-action"
                        style={{ paddingLeft: `${1 + index * 1.5}rem` }}
                      >
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id={`${state.facetId}-${item.value}-facet-value`}
                          disabled={state.isLoading}
                          checked={controller.isValueSelected(item)}
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
                  </ul>
                </li>

                {activeValueChildren.length > 0 && (
                  <li className="list-group-item p-0">
                    <ul className="list-group list-group-flush">
                      {activeValueChildren.map((item) => (
                        <li 
                          key={item.value} 
                          className="list-group-item list-group-item-action"
                          style={{ paddingLeft: `${1 + ancestry.length * 1.5}rem` }}
                        >
                          <input
                            className="form-check-input me-2"
                            type="checkbox"
                            id={`${state.facetId}-${item.value}-facet-value`}
                            disabled={state.isLoading}
                            checked={false}
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
                    </ul>
                  </li>
                )}
              </>
            ) : (
              <li className="list-group-item p-0">
                <ul className="list-group list-group-flush">
                  {state.values.map((item) => (
                    <li key={item.value} className="list-group-item list-group-item-action">
                      <input
                        className="form-check-input me-2"
                        type="checkbox"
                        id={`${state.facetId}-${item.value}-facet-value`}
                        disabled={state.isLoading}
                        checked={false}
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
                </ul>
              </li>
            )}

            {state.canShowLessValues && (
              <li className="list-group-item p-0">
                <button
                  className="btn btn-light btn-sm w-100"
                  type="button"
                  disabled={state.isLoading}
                  onClick={showLess}
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
                  onClick={showMore}
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
