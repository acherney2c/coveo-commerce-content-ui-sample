import { useEffect, useState } from 'react';
import {
  buildPager,
  buildResultList,
  type Pager,
  type Result,
  type ResultListState,
  type SearchEngine,
} from '@coveo/headless';
import ContentPager from '../content-pager/content-pager.js';
import ContentResultLink from '../content-result-link/content-result-link.js';
import { environment } from '../../environments/environment.js';

interface IStoreResultsProps {
  searchEngine: SearchEngine;
}

function getRawString(result: Result, keys: string[]): string | null {
  for (const key of keys) {
    const value = result.raw[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (Array.isArray(value)) {
      const firstString = value.find(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      );
      if (firstString) {
        return firstString;
      }
    }
  }

  return null;
}
export default function StoreResults(props: IStoreResultsProps) {
  const { searchEngine } = props;
  const [state, setState] = useState<ResultListState | null>(null);
  const [pagerController, setPagerController] = useState<Pager | null>(null);

  useEffect(() => {
    const resultList = buildResultList(searchEngine, {
      options: {
        fieldsToInclude: Object.values(environment.contentFields.store),
      },
    });
    const pager = buildPager(searchEngine);

    setState(resultList.state);
    setPagerController(pager);

    const unsubscribeResultList = resultList.subscribe(() => {
      setState(resultList.state);
    });

    return () => {
      unsubscribeResultList();
    };
  }, [searchEngine]);

  if (!state || !pagerController) {
    return <div>Loading...</div>;
  }

  if (state.isLoading) {
    return <p>Loading stores...</p>;
  }

  if (state.results.length === 0) {
    return <p className="text-muted">No stores found.</p>;
  }

  return (
    <div>
      <p className="mb-3 small">
        Showing {state.results.length} store
        {state.results.length !== 1 ? 's' : ''}
      </p>
      <div className="list-group">
        {state.results.map((result) => {
          const storeAddress = getRawString(
            result,
            [environment.contentFields.store.address]
          );
          const fallbackText = result.excerpt || result.title || 'Store';

          return (
            <ContentResultLink
              key={result.uniqueId}
              searchEngine={searchEngine}
              result={result}
            >
              <div className="d-flex w-100 justify-content-between align-items-start gap-3">
                <div>
                  {/* Plain text only: these index-derived fields must not be injected as HTML (stored-XSS risk). */}
                  {storeAddress ? (
                    <div>{storeAddress}</div>
                  ) : (
                    <p className="mb-0 small text-muted">{fallbackText}</p>
                  )}
                </div>
              </div>
            </ContentResultLink>
          );
        })}
      </div>
      <ContentPager controller={pagerController} />
    </div>
  );
}
