import { useEffect, useRef, useState } from 'react';
import {
  buildRecommendations,
  type Cart,
  type CommerceEngine,
  type Context,
  type Recommendations,
} from '@coveo/headless/commerce';
import RecommendationsInterface from '../recommendations-interface/recommendations-interface.js';

interface IRecommendationsSlotProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
  viewUrl: string;
  slotId: string | undefined;
  configKey: string;
  productId?: string;
}

export default function RecommendationsSlot(props: IRecommendationsSlotProps) {
  const { engine, cartController, contextController, viewUrl, slotId, configKey, productId } = props;
  const [recommendationsController, setRecommendationsController] =
    useState<Recommendations | null>(null);
  const lastInit = useRef<{ key: string; engine: CommerceEngine } | null>(null);

  useEffect(() => {
    if (!slotId) {
      return;
    }

    // Rebuild (and refresh) only when the engine or slot actually changes, so a
    // StrictMode double-invocation or an engine prop replacement can't leave an
    // unrefreshed controller in state.
    const key = `${slotId}:${productId ?? ''}`;
    if (lastInit.current?.key === key && lastInit.current.engine === engine) {
      return;
    }
    lastInit.current = { key, engine };

    // This child effect runs before the parent page's setView effect, so apply
    // the view here to ensure the first recommendations request uses the page's
    // view rather than the default one.
    contextController.setView({ url: viewUrl });

    const recommendations = buildRecommendations(engine, {
      options: {
        slotId,
        ...(productId ? { productId } : {}),
      },
    });
    setRecommendationsController(recommendations);
    recommendations.refresh();
  }, [engine, slotId, productId, contextController, viewUrl]);

  if (!slotId) {
    return (
      <div className="row">
        <div className="col-12">
          <p className="mt-4">
            Configure <code>recommendations.{configKey}</code> in{' '}
            <code>src/environments/environment.ts</code> to enable
            recommendations. Slot ID can be found in Coveo Merchandising Hub.
          </p>
        </div>
      </div>
    );
  }

  if (!recommendationsController) {
    return null;
  }

  return (
    <RecommendationsInterface
      cartController={cartController}
      recommendationsController={recommendationsController}
    />
  );
}
