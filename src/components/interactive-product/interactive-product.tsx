import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Cart,
  CartState,
  InteractiveProduct as HeadlessInteractiveProduct,
  Product,
} from '@coveo/headless/commerce';
import { HighlightUtils } from '@coveo/headless/commerce';
import { formatCurrency } from '../../utils/format-currency.js';
import { environment } from '../../environments/environment.js';
import { buildProductUrl } from '../../utils/product-url.js';

interface IInteractiveProductProps {
  cartController: Cart;
  productController: HeadlessInteractiveProduct;
  product: Product;
}

export default function InteractiveProduct(props: IInteractiveProductProps) {
  const { cartController, productController, product } = props;
  const [cartState, setCartState] = useState<CartState>(cartController.state);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = cartController.subscribe(() => {
      setCartState(cartController.state);
    });
    return () => unsubscribe();
  }, [cartController]);

  const isInCart = cartState.items.some(
    (item) => item.productId === product.ec_product_id
  );

  const numberInCart =
    cartState.items.find((item) => item.productId === product.ec_product_id)
      ?.quantity ?? 0;

  const formatExcerpt = (p: Product): string => {
    return HighlightUtils.highlightString({
      content: p.excerpt || '',
      highlights: p.excerptHighlights || [],
      openingDelimiter: '<strong>',
      closingDelimiter: '</strong>',
    });
  };

  const selectProduct = () => {
    productController.select();
    navigate(buildProductUrl(product));
  };

  const adjustQuantity = (delta: number) => {
    cartController.updateItemQuantity({
      name: product.ec_name ?? product.permanentid,
      price: product.ec_promo_price ?? product.ec_price ?? 0,
      productId: product.ec_product_id ?? product.permanentid,
      quantity: numberInCart + delta,
    });
  };

  const removeFromCart = () => {
    cartController.updateItemQuantity({
      name: product.ec_name ?? product.permanentid,
      price: product.ec_promo_price ?? product.ec_price ?? 0,
      productId: product.ec_product_id ?? product.permanentid,
      quantity: 0,
    });
  };

  const getImageUrl = (imagePath: string): string => {
    // If image path already has a protocol (http/https), return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Otherwise, prepend the base URL
    return `${environment.imageBaseUrl}${imagePath}`;
  };

  const imageUrl =
    product.ec_images && product.ec_images[0]
      ? getImageUrl(product.ec_images[0].split(';')[0])
      : 'https://png.pngtree.com/png-vector/20221125/ourmid/pngtree-no-image-available-icon-flatvector-illustration-pic-design-profile-vector-png-image_40966566.jpg';

  const stockStatus = (() => {
    const fieldName = environment.stockAvailabilityField;
    if (!fieldName) return null;

    const directValue = (product as unknown as Record<string, unknown>)[fieldName];
    if (typeof directValue === 'string' && directValue.length > 0) {
      return directValue;
    }

    const additionalValue = (product.additionalFields as Record<string, unknown> | undefined)?.[fieldName];
    if (typeof additionalValue === 'string' && additionalValue.length > 0) {
      return additionalValue;
    }

    return null;
  })();

  return (
    <div className="card h-100">
      <div className="card-body">
        <h5 className="card-title">
          <button
            className="btn btn-link p-0"
            type="button"
            onClick={selectProduct}
          >
            {product.ec_name}
          </button>
        </h5>
        <div className="text-center mb-3">
          <img
            className="img-fluid rounded-start"
            src={imageUrl}
            height="100"
            width="100"
            alt=""
          />
        </div>
        <p
          className="card-text"
          dangerouslySetInnerHTML={{ __html: formatExcerpt(product) }}
        />
        {product.ec_promo_price && product.ec_promo_price < (product.ec_price ?? Infinity) ? (
          <p className="card-text">
            <small className="text-body-secondary">
              <span style={{ textDecoration: 'line-through', marginRight: '0.5rem' }}>
                {formatCurrency(product.ec_price || 0)}
              </span>
              <span style={{ color: 'red', fontWeight: 'bold' }}>
                {formatCurrency(product.ec_promo_price)}
              </span>
            </small>
          </p>
        ) : product.ec_price ? (
          <p className="card-text">
            <small className="text-body-secondary">
              {formatCurrency(product.ec_price || 0)}
            </small>
          </p>
        ) : null}
        {stockStatus ? (
          <p className="card-text">
            <small className="text-body-secondary">{stockStatus}</small>
          </p>
        ) : null}
      </div>
      <div className="card-footer bg-transparent border-0">
        <div
          className="btn-group btn-group-sm w-100"
          role="group"
          aria-label="Manage Cart"
        >
          <Link className="btn btn-outline-secondary" to="/cart">
            Cart ({numberInCart})
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => adjustQuantity(1)}
          >
            +1
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!isInCart}
            onClick={() => adjustQuantity(-1)}
          >
            −1
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!isInCart}
            onClick={removeFromCart}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
