import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  InstantProducts,
  InstantProductsState,
} from '@coveo/headless/commerce';
import InstantProductsView from '../../instant-products/instant-products.js';

export interface InstantProductsProps {
  controller: InstantProducts;
  /** The committed Effective Query the products should reflect (null = nothing committed). */
  committedQuery: string | null;
  /** The exact text the user typed (for the "Showing results for" notice comparison). */
  typedQuery: string;
  /** Called after a product is selected (e.g. to close the dropdown). */
  onProductSelect?: () => void;
}

const normalize = (v: string) => v.trim().toLowerCase();

/**
 * Self-contained Instant Products column. Owns driving its own controller off the
 * committed Effective Query and derives its display state (notice, no-results) from
 * the controller's own state — so the whole feature can be removed by deleting this
 * component and its one usage in the dropdown, with no shared hook or driver edits.
 */
export default function InstantProducts(props: InstantProductsProps) {
  const { controller, committedQuery, typedQuery, onProductSelect } = props;

  const [state, setState] = useState<InstantProductsState>(controller.state);
  useEffect(() => {
    const unsubscribe = controller.subscribe(() => setState(controller.state));
    return () => unsubscribe();
  }, [controller]);

  // Drive ProductSuggest off the committed query. useLayoutEffect fires before
  // paint so the controller starts loading without rendering stale products first.
  // committedQuery already dedups, so this fires once per genuine query change.
  const lastDrivenRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (committedQuery && committedQuery !== lastDrivenRef.current) {
      lastDrivenRef.current = committedQuery;
      controller.updateQuery(committedQuery);
    }
  }, [committedQuery, controller]);

  // Display state derived from the COMMITTED query (what the products reflect),
  // not the live suggestion-loading flag — so the list and notice don't flash.
  const hasProducts = state.products.length > 0;
  const isCommitted = committedQuery !== null;
  const shouldShowNoResults = isCommitted && !state.isLoading && !hasProducts;
  const suggestionNotice =
    committedQuery && normalize(committedQuery) !== normalize(typedQuery)
      ? committedQuery
      : null;

  return (
    <InstantProductsView
      controller={controller}
      products={state.products}
      isLoading={state.isLoading}
      effectiveQuery={committedQuery ?? ''}
      suggestionNotice={suggestionNotice}
      shouldShowNoResults={shouldShowNoResults}
      onProductSelect={onProductSelect}
    />
  );
}
