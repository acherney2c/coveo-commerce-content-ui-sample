import {
  buildSearchEngine,
  getSampleSearchEngineConfiguration,
  loadFieldActions,
  type SearchEngine,
} from '@coveo/headless';
import { environment } from '../environments/environment.js';
import { contentPreprocessRequest } from './content-request-customisation.js';
import { normalizeFieldName } from '../utils/coveo-field.js';

const CONTENT_RESULT_FIELD = normalizeFieldName(environment.contentSearchTabField);
const CONTENT_SOURCE_FILTER = environment.contentSearchTabs
  .map(({ cqExpression }) => `(${cqExpression})`)
  .join(' OR ');
const CONTENT_COUNT_GROUP_BYS = Object.values(
  environment.contentSearchTabs.reduce<
    Record<string, { field: string; allowedValues: Set<string> }>
  >((groupBys, tab) => {
    const fieldName = normalizeFieldName(tab.countField ?? environment.contentSearchTabField);

    if (!groupBys[fieldName]) {
      groupBys[fieldName] = {
        field: `@${fieldName}`,
        allowedValues: new Set<string>(),
      };
    }

    groupBys[fieldName].allowedValues.add(tab.countValue);

    return groupBys;
  }, {})
).map(({ field, allowedValues }) => ({
  field,
  allowedValues: [...allowedValues],
}));
const CONTENT_COUNT_GROUP_BY_FIELDS = new Set(
  CONTENT_COUNT_GROUP_BYS.map(({ field }) => normalizeFieldName(field))
);

let _searchEngine: SearchEngine | null = null;
let _searchEnginePromise: Promise<SearchEngine> | null = null;
let _currentStoreCode: string | null = null;
let _buildVersion = 0;

async function fetchSearchToken(storeCode: string): Promise<string> {
  const url = new URL(environment.tokenEndpoint, window.location.origin);
  url.searchParams.set('store', storeCode);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.token) {
    throw new Error('Token endpoint returned no token');
  }
  return data.token;
}

const CONTENT_PREPROCESS_OPTIONS = {
  countGroupBys: CONTENT_COUNT_GROUP_BYS,
  countGroupByFields: CONTENT_COUNT_GROUP_BY_FIELDS,
  sourceFilter: CONTENT_SOURCE_FILTER,
  debug: environment.debug,
};

function buildAndConfigureEngine(engine: SearchEngine): SearchEngine {
  const { registerFieldsToInclude } = loadFieldActions(engine);
  engine.dispatch(registerFieldsToInclude([
    CONTENT_RESULT_FIELD,
    ...Object.values(environment.contentFields).flatMap(Object.values),
  ]));
  return engine;
}

/**
 * Returns a Coveo Search engine configured for content search.
 */
export const getSearchEngine = async (
  storeCode: string = 'default'
): Promise<SearchEngine> => {
  if (_currentStoreCode !== null && _currentStoreCode !== storeCode) {
    _searchEngine = null;
    _searchEnginePromise = null;
  }
  _currentStoreCode = storeCode;

  if (_searchEngine !== null) {
    return _searchEngine;
  }

  if (_searchEnginePromise !== null) {
    return _searchEnginePromise;
  }

  _searchEnginePromise = (async () => {
    const buildId = ++_buildVersion;

    if (environment.useSampleConfig) {
      _searchEngine = buildAndConfigureEngine(
        buildSearchEngine({
          configuration: {
            ...getSampleSearchEngineConfiguration(),
            preprocessRequest: (request, clientOrigin, metadata) =>
              contentPreprocessRequest(request, clientOrigin, metadata, CONTENT_PREPROCESS_OPTIONS),
            search: {
              searchHub: environment.contentSearchHub,
            },
          },
        })
      );
      return _searchEngine;
    }

    try {
      const token = await fetchSearchToken(storeCode);

      if (buildId !== _buildVersion) {
        return getSearchEngine(_currentStoreCode || 'default');
      }

      _searchEngine = buildAndConfigureEngine(
        buildSearchEngine({
          configuration: {
            accessToken: token,
            organizationId: environment.organizationId,
            analytics: {
              analyticsMode: 'legacy',
            },
            preprocessRequest: (request, clientOrigin, metadata) =>
              contentPreprocessRequest(request, clientOrigin, metadata, CONTENT_PREPROCESS_OPTIONS),
            search: {
              searchHub: environment.contentSearchHub,
            },
            renewAccessToken: async () => {
              return fetchSearchToken(_currentStoreCode || storeCode || 'default');
            },
          },
        })
      );

      return _searchEngine;
    } catch (error) {
      _searchEnginePromise = null;
      throw error;
    }
  })();

  return _searchEnginePromise;
};

/**
 * Reset the search engine (e.g. on store change).
 */
export const resetSearchEngine = () => {
  _searchEngine = null;
  _searchEnginePromise = null;
  _currentStoreCode = null;
  _buildVersion++;
};
