import { useEffect, useState } from 'react';
import type { Pager } from '@coveo/headless';

interface IContentPagerProps {
  controller: Pager;
}

export default function ContentPager(props: IContentPagerProps) {
  const { controller } = props;
  const [state, setState] = useState(controller.state);

  useEffect(() => {
    setState(controller.state);

    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });

    return () => unsubscribe();
  }, [controller]);

  const { currentPages, hasNextPage, hasPreviousPage, maxPage } = state;

  if (maxPage <= 1) {
    return null;
  }

  return (
    <nav aria-label="Content search pagination" className="mt-4">
      <ul className="pagination pagination-sm flex-wrap mb-0">
        <li className={`page-item ${hasPreviousPage ? '' : 'disabled'}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => controller.previousPage()}
            disabled={!hasPreviousPage}
            aria-label="Go to previous page"
          >
            Previous
          </button>
        </li>
        {currentPages.map((page) => {
          const isCurrentPage = controller.isCurrentPage(page);

          return (
            <li
              key={page}
              className={`page-item ${isCurrentPage ? 'active' : ''}`}
              aria-current={isCurrentPage ? 'page' : undefined}
            >
              <button
                type="button"
                className="page-link"
                onClick={() => controller.selectPage(page)}
                disabled={isCurrentPage}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </button>
            </li>
          );
        })}
        <li className={`page-item ${hasNextPage ? '' : 'disabled'}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => controller.nextPage()}
            disabled={!hasNextPage}
            aria-label="Go to next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}