import type {
  Cart,
  InteractiveProduct,
  InteractiveProductProps,
  Product,
} from '@coveo/headless/commerce';
import InteractiveProductComponent from '../interactive-product/interactive-product.js';

interface IProductListProps {
  cartController: Cart;
  controllerBuilder: (props: InteractiveProductProps) => InteractiveProduct;
  products: Product[];
}

export default function ProductList(props: IProductListProps) {
  const { cartController, controllerBuilder, products } = props;

  return (
    <div className="mb-3">
      <div className="row">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.permanentid} className="col-md-4 mb-4">
              <InteractiveProductComponent
                cartController={cartController}
                productController={controllerBuilder({ options: { product } })}
                product={product}
              />
            </div>
          ))
        ) : (
          <p>No products found.</p>
        )}
      </div>
    </div>
  );
}
