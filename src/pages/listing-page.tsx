import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  buildNotifyTrigger,
  buildProductListing,
  type Cart,
  type CommerceEngine,
  type Context,
  type NotifyTrigger,
  type ProductListing,
  type ProductListingState,
} from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import SearchAndListingInterface from '../components/search-and-listing-interface/search-and-listing-interface.js';
import RecommendationsSlot from '../components/recommendations-slot/recommendations-slot.js';
import NotifyTriggerComponent from '../components/triggers/notify-trigger.js';
import { useCommerceUrlManagerSync } from '../hooks/use-commerce-url-manager-sync.js';

interface IListingPageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
}

export default function ListingPage(props: IListingPageProps) {
  const { engine, cartController, contextController } = props;
  const location = useLocation();
  const { url } = useParams<{ url: string }>();
  const decodedUrl = url ? decodeURIComponent(url) : '';
  const [listingController, setListingController] =
    useState<ProductListing | null>(null);
  const [listingState, setListingState] = useState<ProductListingState | null>(
    null
  );
  const [notifyTriggerController, setNotifyTriggerController] =
    useState<NotifyTrigger | null>(null);
  const initialListingLoadExecuted = useRef(false);
  const listingUrlManager = useCommerceUrlManagerSync(listingController);

  useEffect(() => {
    initialListingLoadExecuted.current = false;
    setListingController(null);
    setListingState(null);
    setNotifyTriggerController(null);

    contextController.setView({ url: decodedUrl });

    const listing = buildProductListing(engine);
    setListingController(listing);
    setListingState(listing.state);

    const unsubscribe = listing.subscribe(() => {
      setListingState(listing.state);
    });

    const notifyTrigger = buildNotifyTrigger(engine);
    setNotifyTriggerController(notifyTrigger);

    return () => unsubscribe();
  }, [contextController, decodedUrl, engine]);

  useEffect(() => {
    if (!listingController || !listingUrlManager || location.search) {
      return;
    }

    if (initialListingLoadExecuted.current) {
      return;
    }

    initialListingLoadExecuted.current = true;
      listingController.refresh();
  }, [listingController, listingUrlManager, location.search]);

  if (!listingController || !listingState || !notifyTriggerController) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h5 className="mb-4">
        Product Listing Page
        <small className="d-block mt-2 text-body-secondary">{decodedUrl}</small>
      </h5>

      {listingState.error ? (
        <div className="alert alert-danger" role="alert">
          <p>{listingState.error.message}</p>
          <p>
            Please check that the following URL has been configured for a
            Product Listing Page in the Coveo Merchandising Hub:
          </p>
          <code>{decodedUrl}</code>
        </div>
      ) : (
        <>
          <NotifyTriggerComponent controller={notifyTriggerController} />

          <SearchAndListingInterface
            searchOrListingController={listingController}
            cartController={cartController}
          />
        </>
      )}

      <RecommendationsSlot
        key={decodedUrl}
        engine={engine}
        cartController={cartController}
        contextController={contextController}
        viewUrl={decodedUrl}
        slotId={environment.recommendations?.productListingSlotId}
        configKey="productListingSlotId"
      />
    </div>
  );
}
