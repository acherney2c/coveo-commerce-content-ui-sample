import { useEffect, useState } from 'react';
import type {
  Cart,
  Recommendations as HeadlessRecommendations,
  RecommendationsState,
} from '@coveo/headless/commerce';
import ProductList from '../product-list/product-list.js';

interface IRecommendationsInterfaceProps {
  cartController: Cart;
  recommendationsController: HeadlessRecommendations;
}

export default function RecommendationsInterface(
  props: IRecommendationsInterfaceProps
) {
  const { cartController, recommendationsController } = props;
  const [state, setState] = useState<RecommendationsState>(
    recommendationsController.state
  );

  useEffect(() => {
    const unsubscribe = recommendationsController.subscribe(() => {
      setState(recommendationsController.state);
    });
    return () => unsubscribe();
  }, [recommendationsController]);

  if (!state.products || state.products.length === 0) {
    return null;
  }

  return (
    <div className="row">
      <div className="col-12">
        <h5 className="my-3">
          Recommendations{' '}
          {state.headline && (
            <small className="text-body-secondary">{state.headline}</small>
          )}
        </h5>
        <ProductList
          cartController={cartController}
          controllerBuilder={recommendationsController.interactiveProduct}
          products={state.products}
        />
      </div>
    </div>
  );
}
