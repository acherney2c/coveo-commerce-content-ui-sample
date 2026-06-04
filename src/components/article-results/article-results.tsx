import { useEffect, useState } from 'react';
import {
  buildPager,
  buildResultList,
  type Pager,
  type SearchEngine,
  type ResultListState,
} from '@coveo/headless';
import ContentPager from '../content-pager/content-pager.js';
import ContentResultLink from '../content-result-link/content-result-link.js';
import { environment } from '../../environments/environment.js';
import './article-results.css';

interface IArticleResultsProps {
  searchEngine: SearchEngine;
  loadingMessage?: string;
  emptyMessage?: string;
  resultLabel?: string;
}

export default function ArticleResults(props: IArticleResultsProps) {
  const {
    searchEngine,
    loadingMessage = 'Loading articles...',
    emptyMessage = 'No articles found.',
    resultLabel = 'article',
  } = props;
  const [state, setState] = useState<ResultListState | null>(null);
  const [pagerController, setPagerController] = useState<Pager | null>(null);

  useEffect(() => {
    const resultList = buildResultList(searchEngine, {
      options: {
        fieldsToInclude: Object.values(environment.contentFields.article),
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
    return <p>{loadingMessage}</p>;
  }

  if (state.results.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }

  return (
    <div>
      <p className="mb-3 small">
        Showing {state.results.length} {resultLabel}
        {state.results.length !== 1 ? 's' : ''}
      </p>
      <div className="d-flex flex-column gap-3">
        {state.results.map((result) => {
          const featuredImage = result.raw[
            environment.contentFields.article.featuredImage
          ] as string | undefined;
          const description = result.raw[
            environment.contentFields.article.description
          ] as string | undefined;

          return (
            <ContentResultLink
              key={result.uniqueId}
              searchEngine={searchEngine}
              result={result}
              className="article-card"
            >
              <div className="article-card__image-wrap">
                {featuredImage ? (
                  <img
                    className="article-card__image"
                    src={featuredImage}
                    alt={result.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="article-card__image-placeholder">📄</div>
                )}
              </div>
              <div className="article-card__body">
                <p className="article-card__title">{result.title}</p>
                {description && (
                  <p className="article-card__description">{description}</p>
                )}
                {/* Plain text only: excerpt is index-derived; never inject as HTML (stored-XSS risk). */}
                {result.excerpt && (
                  <p className="article-card__excerpt">{result.excerpt}</p>
                )}
              </div>
            </ContentResultLink>
          );
        })}
      </div>
      <ContentPager controller={pagerController} />
    </div>
  );
}
