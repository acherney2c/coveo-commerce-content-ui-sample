import { useEffect, useState } from 'react';
import type {
  Cart,
  ProductListing,
  ProductListingState,
  Search,
  SearchState,
} from '@coveo/headless/commerce';
import { environment } from '../../environments/environment.js';
import ProductList from '../product-list/product-list.js';
import FacetGenerator from '../facets/facet-generator.js';
import BreadcrumbManager from '../breadcrumb-manager/breadcrumb-manager.js';
import Summary from '../summary/summary.js';
import ShowMore from '../show-more/show-more.js';
import Sort from '../sort/sort.js';

interface ISearchAndListingInterfaceProps {
  searchOrListingController: Search | ProductListing;
  cartController: Cart;
}

export default function SearchAndListingInterface(
  props: ISearchAndListingInterfaceProps
) {
  const { searchOrListingController, cartController } = props;
  const [state, setState] = useState<SearchState | ProductListingState>(
    searchOrListingController.state
  );

  useEffect(() => {
    const unsubscribe = searchOrListingController.subscribe(() => {
      setState(searchOrListingController.state);
    });
    return () => unsubscribe();
  }, [searchOrListingController]);

  const relevanceInspectorUrl = `${environment.platformUrl}/admin/#${environment.organizationId}/search/relevanceInspector/${state.responseId}`;

  return (
    <>
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between flex-wrap">
            <Summary controller={searchOrListingController.summary()} />
            <div className="d-flex align-items-center justify-content-between flex-wrap">
              <Sort controller={searchOrListingController.sort()} />
              <a
                className={`btn btn-sm btn-outline-info mb-3 ms-1 ${state.isLoading ? 'disabled' : ''}`}
                href={relevanceInspectorUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Relevance Inspector
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-12 col-md-4">
          <FacetGenerator
            controller={searchOrListingController.facetGenerator()}
          />
        </div>
        <div className="col">
          {state.isLoading ? (
            <p>Loading...</p>
          ) : (
            <>
              <BreadcrumbManager
                controller={searchOrListingController.breadcrumbManager()}
              />
              <ProductList
                cartController={cartController}
                controllerBuilder={searchOrListingController.interactiveProduct}
                products={state.products || []}
              />
              <ShowMore controller={searchOrListingController.pagination()} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
