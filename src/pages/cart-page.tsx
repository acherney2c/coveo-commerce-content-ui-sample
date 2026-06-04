import { useEffect } from 'react';
import {
  type Cart,
  type CommerceEngine,
  type Context,
} from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import CartComponent from '../components/cart/cart.js';
import RecommendationsSlot from '../components/recommendations-slot/recommendations-slot.js';

interface ICartPageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
}

export default function CartPage(props: ICartPageProps) {
  const { engine, cartController, contextController } = props;

  useEffect(() => {
    const url = `${environment.context.view.url}/cart`;
    contextController.setView({ url });
  }, [contextController]);

  return (
    <div>
      <h5 className="mb-4">Cart Page</h5>
      
      <CartComponent controller={cartController} contextController={contextController} />

      <RecommendationsSlot
        engine={engine}
        cartController={cartController}
        contextController={contextController}
        viewUrl={`${environment.context.view.url}/cart`}
        slotId={environment.recommendations?.cartSlotId}
        configKey="cartSlotId"
      />
    </div>
  );
}
