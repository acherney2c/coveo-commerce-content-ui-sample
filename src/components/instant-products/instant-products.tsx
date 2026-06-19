import { useNavigate } from 'react-router-dom';
import type { InstantProducts as HeadlessInstantProducts, Product } from '@coveo/headless/commerce';
import { buildProductUrl } from '../../utils/product-url.js';

interface IInstantProductsProps {
  controller: HeadlessInstantProducts;
  products: Product[];
  isLoading: boolean;
  /** The committed query the products reflect (for the "No results" message) */
  effectiveQuery: string;
  /** The suggestion notice to show (null = no notice) */
  suggestionNotice: string | null;
  /** Whether to show "No results" */
  shouldShowNoResults: boolean;
  /** Called after a product is selected (e.g. to close the dropdown). */
  onSelectProduct?: () => void;
}

export default function InstantProducts(props: IInstantProductsProps) {
  const {
    controller,
    products,
    isLoading,
    effectiveQuery,
    suggestionNotice,
    shouldShowNoResults,
    onSelectProduct,
  } = props;
  const navigate = useNavigate();

  const selectProduct = (product: Product) => {
    controller
      .interactiveProduct({ options: { product } })
      .select();
    navigate(buildProductUrl(product));
    onSelectProduct?.();
  };

  return (
    <div className="list-group shadow">
      <div className="list-group-item text-muted small d-flex justify-content-between">
        <span>Instant Products</span>
        {isLoading && (
          <span className="spinner-border spinner-border-sm" role="status" />
        )}
      </div>

      {suggestionNotice && (
        <div className="list-group-item list-group-item-warning small py-2">
          Showing results for <strong>&quot;<span>{suggestionNotice}</span>&quot;</strong>
        </div>
      )}

      {/* Products are shown whenever present — they are NOT gated on the live
          suggestion-loading flag, so the list does not flash on each keystroke. */}
      {products.length > 0 ? (
        products.map((product) => (
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
          No results found for <strong>&quot;<span>{effectiveQuery}</span>&quot;</strong>
        </div>
      ) : (
        <div className="list-group-item text-muted">
          {isLoading ? 'Loading...' : 'None'}
        </div>
      )}
    </div>
  );
}
