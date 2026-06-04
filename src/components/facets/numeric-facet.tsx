import { useEffect, useRef, useState } from 'react';
import type {
  NumericFacet as HeadlessNumericFacet,
  NumericFacetState,
  NumericFacetValue,
} from '@coveo/headless/commerce';

interface INumericFacetProps {
  controller: HeadlessNumericFacet;
}

export default function NumericFacet(props: INumericFacetProps) {
  const { controller } = props;
  const [state, setState] = useState<NumericFacetState>(controller.state);
  const [currentManualRange, setCurrentManualRange] = useState({
    start:
      controller.state.manualRange?.start ??
      controller.state.domain?.min ??
      controller.state.values[0]?.start ??
      0,
    end:
      controller.state.manualRange?.end ??
      controller.state.domain?.max ??
      controller.state.values[0]?.end ??
      0,
  });

  const manualRangeStartInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      const newState = controller.state;
      setState(newState);
      setCurrentManualRange({
        start:
          newState.manualRange?.start ??
          newState.domain?.min ??
          newState.values[0]?.start ??
          0,
        end:
          newState.manualRange?.end ??
          newState.domain?.max ??
          newState.values[0]?.end ??
          0,
      });
    });
    return () => unsubscribe();
  }, [controller]);

  const invalidRange = () => {
    return (
      currentManualRange.start >= currentManualRange.end ||
      Number.isNaN(currentManualRange.start) ||
      Number.isNaN(currentManualRange.end)
    );
  };

  const handleManualStartRangeChange = (value: number) => {
    setCurrentManualRange({
      start: value,
      end: currentManualRange.end,
    });
  };

  const handleManualEndRangeChange = (value: number) => {
    setCurrentManualRange({
      start: currentManualRange.start,
      end: value,
    });
  };

  const selectRange = () => {
    const start =
      state.domain && currentManualRange.start < state.domain.min
        ? state.domain.min
        : currentManualRange.start;
    const end =
      state.domain && currentManualRange.end > state.domain.max
        ? state.domain.max
        : currentManualRange.end;
    controller.setRanges([
      {
        start,
        end,
        endInclusive: true,
        state: 'selected',
      },
    ]);
    manualRangeStartInputRef.current?.focus();
  };

  const clearSelected = () => {
    controller.deselectAll();
    manualRangeStartInputRef.current?.focus();
  };

  const selectFacetValue = (value: NumericFacetValue) => {
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
      <div className="card-body p-0">
        <div className="input-group">
          <span className="input-group-text border-0 rounded-0">From</span>
          <input
            ref={manualRangeStartInputRef}
            className="form-control border-0 border-start border-end rounded-0"
            type="number"
            disabled={state.isLoading}
            value={currentManualRange.start}
            onChange={(e) => handleManualStartRangeChange(Number(e.target.value))}
          />
          <span className="input-group-text border-0 rounded-0">To</span>
          <input
            className="form-control border-0 border-start rounded-0"
            type="number"
            disabled={state.isLoading}
            value={currentManualRange.end}
            onChange={(e) => handleManualEndRangeChange(Number(e.target.value))}
          />
          <button
            className="btn btn-light btn-sm border-start rounded-0"
            type="submit"
            disabled={state.isLoading || invalidRange()}
            onClick={selectRange}
          >
            Submit
          </button>
        </div>
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
