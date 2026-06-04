import { useEffect, useState } from 'react';
import type {
  DateFacet as HeadlessDateFacet,
  DateFacetState,
  DateFacetValue,
} from '@coveo/headless/commerce';

interface IDateFacetProps {
  controller: HeadlessDateFacet;
}

export default function DateFacet(props: IDateFacetProps) {
  const { controller } = props;
  const [state, setState] = useState<DateFacetState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const clearSelected = () => {
    controller.deselectAll();
  };

  const selectFacetValue = (value: DateFacetValue) => {
    controller.toggleSelect(value);
  };

  const showLess = () => {
    controller.showLessValues();
  };

  const showMore = () => {
    controller.showMoreValues();
  };

  return (
    <div className="card small mb-3">
      <div className="card-header">
        {state.displayName ?? state.facetId}
      </div>
      <ul className="list-group list-group-flush">
        {state.isLoading ? (
          <li className="list-group-item text-muted">Loading...</li>
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

            {state.values.map((item, index) => (
              <li key={index} className="list-group-item list-group-item-action">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  id={`${state.facetId}-${item.start}-${item.end}-${item.endInclusive}-facet-value`}
                  disabled={state.isLoading}
                  checked={item.state !== 'idle'}
                  onChange={() => selectFacetValue(item)}
                />
                <label
                  className="form-check-label stretched-link"
                  htmlFor={`${state.facetId}-${item.start}-${item.end}-${item.endInclusive}-facet-value`}
                >
                  {item.start} to {item.end}
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
