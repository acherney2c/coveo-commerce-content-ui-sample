import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  type Cart,
  type CommerceEngine,
  type Context,
} from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import RecommendationsSlot from '../components/recommendations-slot/recommendations-slot.js';

interface IProductPageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
}

export default function ProductPage(props: IProductPageProps) {
  const { engine, cartController, contextController } = props;
  const { id, '*': wildcard } = useParams<{ id: string; '*': string }>();
  
  // Parse name and price from the wildcard path segments
  const pathSegments = wildcard?.split('/').filter(Boolean) || [];
  const name = pathSegments.length > 0 ? pathSegments.slice(0, -1).join('/') : undefined;
  const price = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : undefined;

  useEffect(() => {
    const url = `${environment.context.view.url}/product/${id}${wildcard ? '/' + wildcard : ''}`;
    contextController.setView({ url });
  }, [contextController, id, wildcard]);

  return (
    <div>
      <h5 className="mb-4">Product Page</h5>
      <div className="row">
        <div className="col-12">
          <p className="text-muted">
            Product ID: {id}<br />
            Name: {name}<br />
            Price: {price}
          </p>
          <p className="text-muted">
            Product detail components will be displayed here.
          </p>
        </div>
      </div>

      <RecommendationsSlot
        engine={engine}
        cartController={cartController}
        contextController={contextController}
        viewUrl={`${environment.context.view.url}/product/${id}${wildcard ? '/' + wildcard : ''}`}
        slotId={environment.recommendations?.productDetailSlotId}
        configKey="productDetailSlotId"
        productId={id}
      />
    </div>
  );
}
