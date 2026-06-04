import {
  buildCommerceEngine,
  getSampleCommerceEngineConfiguration,
  type CommerceEngine,
} from '@coveo/headless/commerce';
import {loadCartItemsFromLocalStorage} from '../utils/cart-utils.js';
import {environment} from '../environments/environment.js';
import {commercePreprocessRequest} from './commerce-request-customisation.js';

let _engine: CommerceEngine | null = null;
let _enginePromise: Promise<CommerceEngine> | null = null;
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

export const getEngine = async (
  storeCode: string = 'default'
): Promise<CommerceEngine> => {
  // If store code changed, reset the engine to force a new token
  if (_currentStoreCode !== null && _currentStoreCode !== storeCode) {
    _engine = null;
    _enginePromise = null;
  }
  _currentStoreCode = storeCode;

  if (_engine !== null) {
    return _engine;
  }

  if (_enginePromise !== null) {
    return _enginePromise;
  }

  _enginePromise = (async (): Promise<CommerceEngine> => {
    const buildId = ++_buildVersion;

    if (environment.useSampleConfig) {
      _engine = buildCommerceEngine({
        configuration: {
          ...getSampleCommerceEngineConfiguration(),
          cart: {
            items: loadCartItemsFromLocalStorage() ?? [],
          },
        },
      });
      return _engine;
    }

    try {
      const token = await fetchSearchToken(storeCode);

      if (buildId !== _buildVersion) {
        return getEngine(_currentStoreCode || 'default');
      }

      _engine = buildCommerceEngine({
        configuration: {
          accessToken: token,
          organizationId: environment.organizationId,
          analytics: environment.analytics,
          context: environment.context,
          cart: {
            items: loadCartItemsFromLocalStorage() ?? [],
          },
          renewAccessToken: async () => {
            return fetchSearchToken(_currentStoreCode || storeCode || 'default');
          },
          preprocessRequest: (request, clientOrigin, metadata) =>
            commercePreprocessRequest(request, clientOrigin, metadata, {
              debug: environment.debug,
            }),
        },
      });

      return _engine;
    } catch (error) {
      _enginePromise = null;
      throw error;
    }
  })();

  return _enginePromise;
};
