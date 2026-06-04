import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildNotifyTrigger,
  buildRedirectionTrigger,
  buildSearch,
  buildSearchBox,
  buildInstantProducts,
  buildFilterSuggestionsGenerator,
  type Cart,
  type CommerceEngine,
  type Context,
  type NotifyTrigger,
  type RedirectionTrigger,
  type Search,
  type SearchBox as HeadlessSearchBox,
  type InstantProducts,
  type FilterSuggestionsGenerator,
} from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import SearchBox from '../components/search-box/search-box.js';
import DidYouMean from '../components/did-you-mean/did-you-mean.js';
import NotifyTriggerComponent from '../components/triggers/notify-trigger.js';
import RedirectionTriggerComponent from '../components/triggers/redirection-trigger.js';
import SearchAndListingInterface from '../components/search-and-listing-interface/search-and-listing-interface.js';
import ArticleResults from '../components/article-results/article-results.js';
import StoreResults from '../components/store-results/store-results.js';
import { useCommerceUrlManagerSync } from '../hooks/use-commerce-url-manager-sync.js';
import { useContentSearchTabs } from '../hooks/use-content-search-tabs.js';

interface ISearchPageProps {
  engine: CommerceEngine;
  cartController: Cart;
  contextController: Context;
}

export default function SearchPage(props: ISearchPageProps) {
  const { engine, cartController, contextController } = props;
  const location = useLocation();
  const [searchController, setSearchController] = useState<Search | null>(null);
  const [searchBoxController, setSearchBoxController] = useState<HeadlessSearchBox | null>(null);
  const [instantProductsController, setInstantProductsController] = useState<InstantProducts | null>(null);
  const [filterSuggestionsGeneratorController, setFilterSuggestionsGeneratorController] = useState<FilterSuggestionsGenerator | null>(null);
  const [notifyTriggerController, setNotifyTriggerController] = useState<NotifyTrigger | null>(null);
  const [redirectionTriggerController, setRedirectionTriggerController] = useState<RedirectionTrigger | null>(null);
  const initialSearchExecuted = useRef(false);
  const searchUrlManager = useCommerceUrlManagerSync(searchController);

  const storeCode = localStorage.getItem('selectedStoreCode') || 'default';
  const { status: contentEngineStatus, tabs, activeTab, setActiveTab, contentEngine, activeTabConfig } =
    useContentSearchTabs(searchController, storeCode);

  // Initialize commerce controllers
  useEffect(() => {
    const url = environment.context.view.url + '/search';
    contextController.setView({ url });

    const search = buildSearch(engine);
    setSearchController(search);

    const searchBoxId = 'search-box';
    const searchBox = buildSearchBox(engine, {
      options: {
        id: searchBoxId,
        highlightOptions: {
          correctionDelimiters: { open: '<em>', close: '</em>' },
          exactMatchDelimiters: { open: '<strong>', close: '</strong>' },
        },
      },
    });
    setSearchBoxController(searchBox);

    const instantProducts = buildInstantProducts(engine, {
      options: { searchBoxId },
    });
    setInstantProductsController(instantProducts);

    const filterSuggestionsGenerator = buildFilterSuggestionsGenerator(engine);
    setFilterSuggestionsGeneratorController(filterSuggestionsGenerator);

    const notifyTrigger = buildNotifyTrigger(engine);
    setNotifyTriggerController(notifyTrigger);

    const redirectionTrigger = buildRedirectionTrigger(engine);
    setRedirectionTriggerController(redirectionTrigger);
  }, [engine, contextController]);

  useEffect(() => {
    initialSearchExecuted.current = false;
  }, [searchController]);

  useEffect(() => {
    if (!searchController || !searchUrlManager || location.search) {
      return;
    }

    if (initialSearchExecuted.current) {
      return;
    }

    initialSearchExecuted.current = true;
    searchController.executeFirstSearch();
  }, [location.search, searchController, searchUrlManager]);

  if (!searchController || !searchBoxController || !instantProductsController || !filterSuggestionsGeneratorController || !notifyTriggerController || !redirectionTriggerController) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h5 className="mb-4">Search Page</h5>
      <SearchBox
        searchBoxController={searchBoxController}
        instantProductsController={instantProductsController}
        filterSuggestionsGeneratorController={filterSuggestionsGeneratorController}
      />
      <DidYouMean controller={searchController.didYouMean()} />
      <NotifyTriggerComponent controller={notifyTriggerController} />

      <ul className="nav nav-pills mb-3 mt-3">
        {tabs.map((tab) => (
          <li key={tab.key} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}{' '}
              <span className="badge bg-secondary ms-1">{tab.count}</span>
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'products' && (
        <SearchAndListingInterface
          searchOrListingController={searchController}
          cartController={cartController}
        />
      )}

      {activeTabConfig && activeTabConfig.key !== 'stores' && (
        <>
          {contentEngineStatus === 'loading' && (
            <p>Loading {activeTabConfig.label.toLowerCase()}...</p>
          )}
          {contentEngineStatus === 'error' && (
            <p className="text-danger">Failed to load content results. Please try again later.</p>
          )}
          {contentEngineStatus === 'ready' && contentEngine && (
            <ArticleResults
              searchEngine={contentEngine}
              loadingMessage={`Loading ${activeTabConfig.label.toLowerCase()}...`}
              emptyMessage={`No ${activeTabConfig.label.toLowerCase()} found.`}
              resultLabel={activeTabConfig.key === 'articles' ? 'article' : 'result'}
            />
          )}
        </>
      )}

      {activeTabConfig?.key === 'stores' && (
        <>
          {contentEngineStatus === 'loading' && (
            <p>Loading stores...</p>
          )}
          {contentEngineStatus === 'error' && (
            <p className="text-danger">Failed to load store results. Please try again later.</p>
          )}
          {contentEngineStatus === 'ready' && contentEngine && (
            <StoreResults searchEngine={contentEngine} />
          )}
        </>
      )}

      <RedirectionTriggerComponent controller={redirectionTriggerController} />
    </div>
  );
}
