import type { Product } from '@coveo/headless/commerce';

/**
 * Builds a product URL that handles product names with special characters and slashes.
 * The URL format is: /product/{id}/{name}/{price}
 * 
 * This format works with the route pattern /product/:id/* which allows
 * product names to contain slashes without breaking routing.
 * 
 * @param product - The product object
 * @returns The product URL path
 */
export function buildProductUrl(product: Product): string {
  const productId = product.ec_product_id ?? product.permanentid;
  const productName = product.ec_name ?? product.permanentid;
  const productPrice = product.ec_promo_price ?? product.ec_price ?? 0;
  
  return `/product/${productId}/${productName}/${productPrice}`;
}
