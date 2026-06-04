import { useEffect, useState } from 'react';
import type { Cart, CartState, CartItem } from '@coveo/headless/commerce';
import type { Context } from '@coveo/headless/commerce';
import { formatCurrency } from '../../utils/format-currency.js';

interface ICartProps {
  controller: Cart;
  contextController: Context;
}

export default function CartComponent(props: ICartProps) {
  const { controller } = props;
  const [state, setState] = useState<CartState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const isCartEmpty = state.items.length === 0;

  const adjustQuantity = (item: CartItem, delta: number) => {
    controller.updateItemQuantity({
      ...item,
      quantity: item.quantity + delta,
    });
  };

  const purchase = () => {
    controller.purchase({
      id: crypto.randomUUID(),
      revenue: state.totalPrice || 0,
    });
  };

  const emptyCart = () => {
    controller.empty();
  };

  return (
    <div className="table-responsive mb-3">
      <table className="table table-hover">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Quantity</th>
            <th scope="col">Price</th>
            <th scope="col">Total</th>
            {!isCartEmpty && <th></th>}
          </tr>
        </thead>
        <tbody>
          {state.items.length > 0 ? (
            state.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.price * item.quantity)}</td>
                <td>
                  <div
                    className="btn-group btn-group-sm w-100"
                    role="group"
                    aria-label="Manage Cart Product"
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => adjustQuantity(item, 1)}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => adjustQuantity(item, -1)}
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => adjustQuantity(item, -item.quantity)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>Cart is empty.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>
              <strong>{formatCurrency(state.totalPrice || 0)}</strong>
            </td>
            {!isCartEmpty && (
              <td>
                <div
                  className="btn-group btn-group-sm w-100"
                  role="group"
                  aria-label="Manage Cart"
                >
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={purchase}
                  >
                    Purchase
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={emptyCart}
                  >
                    Empty Cart
                  </button>
                </div>
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
