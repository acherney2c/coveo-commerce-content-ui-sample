import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  InstantProducts as HeadlessInstantProducts,
  InstantProductsState,
  Product,
} from '@coveo/headless/commerce';
import { buildProductUrl } from '../../utils/product-url.js';
import { useSuggestionDrivenInstantProducts } from '../../hooks/use-suggestion-driven-instant-products.js';

interface IInstantProductsProps {
  controller: HeadlessInstantProducts;
  /** Query suggestions for the current input; the first drives Instant Products */
  querySuggestions?: string[];
  /** The Typed Query (exact text the user entered) */
  currentQuery?: string;
  /** Whether QuerySuggest is still loading suggestions for the current input */
  isLoadingSuggestions?: boolean;
  /** Minimum typed-query characters before ProductSuggest fires. Default: 3 */
  minChars?: number;
}

export default function InstantProducts(props: IInstantProductsProps) {
  const {
    controller,
    querySuggestions = [],
    currentQuery = '',
    isLoadingSuggestions = false,
    minChars = 3,
  } = props;
  const meetsThreshold = currentQuery.trim().length >= minChars;
  const [state, setState] = useState<InstantProductsState>(controller.state);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  // Fires a ProductSuggest call for the desired query.
  const handleQuery = useCallback((query: string) => {
    controller.updateQuery(query);
  }, [controller]);

  // The hook owns the decision of which query drives Instant Products.
  const { shouldShowNoResults, suggestionNotice, effectiveQuery } = useSuggestionDrivenInstantProducts({
    products: state.products,
    isLoading: state.isLoading,
    suggestions: querySuggestions,
    isLoadingSuggestions,
    typedQuery: currentQuery,
    onQuery: handleQuery,
    minChars,
  });

  const selectProduct = (product: Product) => {
    controller
      .interactiveProduct({
        options: { product },
      })
      .select();
    navigate(buildProductUrl(product));
  };

  return (
    <div className="list-group shadow">
      <div className="list-group-item text-muted small d-flex justify-content-between">
        <span>Instant Products</span>
        {state.isLoading && (
          <span className="spinner-border spinner-border-sm" role="status" />
        )}
      </div>

      {/* Transparency notice when Instant Products are driven by the First Suggestion. */}
      {/* Note: React JSX automatically escapes text content, preventing XSS */}
      {suggestionNotice && (
        <div className="list-group-item list-group-item-warning small py-2">
          Showing results for <strong>"<span>{suggestionNotice}</span>"</strong>
        </div>
      )}

      {!isLoadingSuggestions && meetsThreshold ? (
        state.products.length > 0 ? (
          state.products.map((product) => (
            <button
              key={product.permanentid}
              className="list-group-item list-group-item-action"
              type="button"
              onClick={() => selectProduct(product)}
            >
              {product.ec_name} ({product.ec_product_id})
            </button>
          ))
        ) : shouldShowNoResults ? (
          <div className="list-group-item text-muted">
            {/* React JSX automatically escapes text content, preventing XSS */}
            No results found for <strong>"<span>{effectiveQuery}</span>"</strong>
          </div>
        ) : (
          <div className="list-group-item text-muted">
            {state.isLoading ? 'Loading...' : 'None'}
          </div>
        )
      ) : (
        <div className="list-group-item text-muted">None</div>
      )}
    </div>
  );
}
