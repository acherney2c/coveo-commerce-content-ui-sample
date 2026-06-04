import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  InstantProducts as HeadlessInstantProducts,
  InstantProductsState,
  Product,
} from '@coveo/headless/commerce';
import { buildProductUrl } from '../../utils/product-url.js';
import { useInstantProductsFallback } from '../../hooks/use-instant-products-fallback.js';

interface IInstantProductsProps {
  controller: HeadlessInstantProducts;
  /** Query suggestions to use for fallback when no products found */
  querySuggestions?: string[];
  /** The current search query */
  currentQuery?: string;
  /** Whether to enable the fallback-to-suggestions feature */
  enableFallback?: boolean;
}

export default function InstantProducts(props: IInstantProductsProps) {
  const {
    controller,
    querySuggestions = [],
    currentQuery = '',
    enableFallback = false
  } = props;
  const [state, setState] = useState<InstantProductsState>(controller.state);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  // Callback when fallback is triggered
  const handleFallback = useCallback((suggestion: string) => {
    controller.updateQuery(suggestion);
  }, [controller]);

  // Use the fallback hook to handle race conditions properly
  const {
    shouldShowNoResults,
    correctionQuery,
    isShowingFallback,
    originalQuery,
  } = useInstantProductsFallback({
    products: state.products,
    isLoading: state.isLoading,
    suggestions: enableFallback ? querySuggestions : [],
    currentQuery,
    onFallback: handleFallback,
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

      {/* Fallback notice when showing alternative results */}
      {/* Note: React JSX automatically escapes text content, preventing XSS */}
      {isShowingFallback && originalQuery && (
        <div className="list-group-item list-group-item-warning small py-2">
          <p className="mb-1">
            No results found for <strong>"<span>{originalQuery}</span>"</strong>
          </p>
          <p className="mb-0">
            Showing results for <strong>"<span>{correctionQuery}</span>"</strong>
          </p>
        </div>
      )}

      {state.products.length > 0 ? (
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
          No results found for <strong>"<span>{currentQuery}</span>"</strong>
        </div>
      ) : (
        <div className="list-group-item text-muted">
          {state.isLoading ? 'Loading...' : 'None'}
        </div>
      )}
    </div>
  );
}
