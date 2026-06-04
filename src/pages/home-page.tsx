import { useEffect, useState } from 'react';
import {
  buildStandaloneSearchBox,
  buildInstantProducts,
  buildFilterSuggestionsGenerator,
  type Cart,
  type CommerceEngine,
  type Context,
  type StandaloneSearchBox as HeadlessStandaloneSearchBox,
  type InstantProducts,
  type FilterSuggestionsGenerator,
} from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import StandaloneSearchBox from '../components/standalone-search-box/standalone-search-box.js';
import RecommendationsSlot from '../components/recommendations-slot/recommendations-slot.js';

interface IHomePageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
}

export default function HomePage(props: IHomePageProps) {
  const { engine, cartController, contextController } = props;
  const [standaloneSearchBoxController, setStandaloneSearchBoxController] =
    useState<HeadlessStandaloneSearchBox | null>(null);
  const [instantProductsController, setInstantProductsController] =
    useState<InstantProducts | null>(null);
  const [filterSuggestionsGeneratorController, setFilterSuggestionsGeneratorController] =
    useState<FilterSuggestionsGenerator | null>(null);

  const standaloneSearchBoxId = 'standalone-search-box';

  useEffect(() => {
    const url = environment.context.view.url;
    contextController.setView({ url });

    const standaloneSearchBox = buildStandaloneSearchBox(engine, {
      options: {
        id: standaloneSearchBoxId,
        redirectionUrl: '/search',
        highlightOptions: {
          correctionDelimiters: { open: '<em>', close: '</em>' },
          exactMatchDelimiters: { open: '<strong>', close: '</strong>' },
        },
      },
    });
    setStandaloneSearchBoxController(standaloneSearchBox);

    const instantProducts = buildInstantProducts(engine, {
      options: {
        searchBoxId: standaloneSearchBoxId,
      },
    });
    setInstantProductsController(instantProducts);

    const filterSuggestionsGenerator = buildFilterSuggestionsGenerator(engine);
    setFilterSuggestionsGeneratorController(filterSuggestionsGenerator);
  }, [engine, contextController]);

  if (!standaloneSearchBoxController || !instantProductsController || !filterSuggestionsGeneratorController) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h5 className="mb-4">Home Page</h5>
      
      <StandaloneSearchBox
        standaloneSearchBoxController={standaloneSearchBoxController}
        instantProductsController={instantProductsController}
        filterSuggestionsGeneratorController={filterSuggestionsGeneratorController}
      />

      <RecommendationsSlot
        engine={engine}
        cartController={cartController}
        contextController={contextController}
        viewUrl={environment.context.view.url}
        slotId={environment.recommendations?.homeSlotId}
        configKey="homeSlotId"
      />
    </div>
  );
}
