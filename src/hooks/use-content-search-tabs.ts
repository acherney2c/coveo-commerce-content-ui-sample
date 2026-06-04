import { useEffect, useRef, useState } from 'react';
import {
  buildTab,
  buildSearchBox as buildHeadlessSearchBox,
  type SearchEngine,
  type SearchBox as HeadlessStandardSearchBox,
  type Tab,
} from '@coveo/headless';
import type { Search } from '@coveo/headless/commerce';
import { environment } from '../environments/environment.js';
import { getSearchEngine } from '../context/search-engine.js';
import { deriveContentTabCounts } from './derive-content-tab-counts.js';

interface ContentTabConfig {
  key: string;
  id?: string;
  label: string;
  countField?: string;
  countValue: string;
  cqExpression: string;
}

export type { ContentTabConfig };

export type TabDescriptor = { key: string; label: string; count: number };

const contentTabConfigs = environment.contentSearchTabs satisfies ReadonlyArray<ContentTabConfig>;

interface SearchResponseWithGroupBy {
  totalCountFiltered: number;
  groupByResults?: Array<{
    field: string;
    values: Array<{ value: string; numberOfResults: number }>;
  }>;
}

export function useContentSearchTabs(
  commerceSearchController: Search | null,
  storeCode: string,
): {
  status: 'loading' | 'ready' | 'error';
  tabs: TabDescriptor[];
  activeTab: string;
  setActiveTab: (key: string) => void;
  contentEngine: SearchEngine | null;
  activeTabConfig: ContentTabConfig | null;
} {
  const [contentSearchEngine, setContentSearchEngine] = useState<SearchEngine | null>(null);
  const [contentEngineStatus, setContentEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [productCount, setProductCount] = useState(0);
  const [contentTabCounts, setContentTabCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(contentTabConfigs.map(({ key }) => [key, 0]))
  );
  const [activeTab, setActiveTab] = useState<string>('products');
  const [contentSearchBoxController, setContentSearchBoxController] = useState<HeadlessStandardSearchBox | null>(null);
  const [contentTabControllers, setContentTabControllers] = useState<Record<string, Tab>>({});
  const lastSyncedContentRequest = useRef('');

  // Track product count from commerce search controller
  useEffect(() => {
    if (!commerceSearchController) return;

    const summary = commerceSearchController.summary();
    setProductCount(summary.state.totalNumberOfProducts);
    const unsubscribe = summary.subscribe(() => {
      setProductCount(summary.state.totalNumberOfProducts);
    });

    return () => unsubscribe();
  }, [commerceSearchController]);

  // Initialize content search engine
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    getSearchEngine(storeCode)
      .then((se) => {
        if (cancelled) return;

        const nextTabControllers = Object.fromEntries(
          contentTabConfigs.map((tabConfig: ContentTabConfig) => [
            tabConfig.key,
            buildTab(se, {
              options: {
                id: tabConfig.id || tabConfig.key,
                expression: tabConfig.cqExpression,
                clearFiltersOnTabChange: false,
              },
            }),
          ])
        ) as Record<string, Tab>;

        setContentSearchEngine(se);
        setContentEngineStatus('ready');
        setContentSearchBoxController(buildHeadlessSearchBox(se));
        setContentTabControllers(nextTabControllers);

        const updateCounts = () => {
          const response = se.state.search.response as SearchResponseWithGroupBy;
          setContentTabCounts(
            deriveContentTabCounts(response, contentTabConfigs, environment.contentSearchTabField)
          );
        };

        updateCounts();
        unsubscribe = se.subscribe(updateCounts);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to initialize content search engine', error);
        setContentEngineStatus('error');
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [storeCode]);

  // Commerce -> content query sync.
  //
  // Analyzed for correctness (commerce->content sync). Findings:
  // - A content result set is fully identified by (active tab, executed query);
  //   commerce facet/sort/pagination changes do NOT reshape content, so the
  //   `${activeTab}:${executedQuery}` key correctly dedupes the redundant
  //   re-syncs that fire on every commerce state change. Accepted limitation:
  //   the key is recorded before the content request resolves, so a failed
  //   identical content search is not retried until the tab or query changes
  //   (auth failures self-heal via the engine's renewAccessToken).
  // - The responseId guard is a startup gate ("commerce has executed once");
  //   executed query and responseId update atomically, so there is no
  //   stale-query window.
  // - No in-session engine-rebuild race: a store change reloads the page
  //   (see docs/adr/0002-store-change-reloads-the-page.md), so storeCode is
  //   fixed for the lifetime of a load.
  useEffect(() => {
    if (
      !contentSearchBoxController ||
      !commerceSearchController ||
      Object.keys(contentTabControllers).length !== contentTabConfigs.length
    ) {
      return;
    }

    const summary = commerceSearchController.summary();

    const syncQuery = () => {
      const commerceResponseId = commerceSearchController.state.responseId;
      if (!commerceResponseId) return;

      const executedQuery = summary.state.query;
      const requestKey = `${activeTab}:${executedQuery}`;
      if (lastSyncedContentRequest.current === requestKey) return;
      lastSyncedContentRequest.current = requestKey;

      contentSearchBoxController.updateText(executedQuery);

      // tab.select() already triggers a search, so skip the explicit submit
      // when switching tabs to avoid a duplicate request.
      let tabSwitched = false;
      const activeContentTabController =
        activeTab === 'products' ? null : contentTabControllers[activeTab];

      if (activeContentTabController && !activeContentTabController.state.isActive) {
        activeContentTabController.select();
        tabSwitched = true;
      }

      if (!tabSwitched) {
        contentSearchBoxController.submit();
      }
    };

    // Sync once on mount or tab switch in case commerce already has results.
    syncQuery();

    const unsubscribe = commerceSearchController.subscribe(syncQuery);

    return () => unsubscribe();
  }, [
    activeTab,
    contentSearchBoxController,
    contentTabControllers,
    commerceSearchController,
  ]);

  const activeTabConfig =
    activeTab === 'products'
      ? null
      : contentTabConfigs.find(({ key }) => key === activeTab) ?? null;

  const tabs: TabDescriptor[] = [
    { key: 'products', label: 'Products', count: productCount },
    ...contentTabConfigs.map((tabConfig) => ({
      key: tabConfig.key,
      label: tabConfig.label,
      count: contentTabCounts[tabConfig.key] ?? 0,
    })),
  ];

  return {
    status: contentEngineStatus,
    tabs,
    activeTab,
    setActiveTab,
    contentEngine: contentSearchEngine,
    activeTabConfig,
  };
}
