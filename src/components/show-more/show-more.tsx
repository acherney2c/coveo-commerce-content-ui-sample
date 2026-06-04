import { useEffect, useState } from 'react';
import type {
  Pagination as HeadlessPagination,
  PaginationState,
} from '@coveo/headless/commerce';

interface IShowMoreProps {
  controller: HeadlessPagination;
}

export default function ShowMore(props: IShowMoreProps) {
  const { controller } = props;
  const [state, setState] = useState<PaginationState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  if (state.totalEntries === 0) {
    return null;
  }

  return (
    <div className="d-flex align-items-center justify-content-center mb-3">
      <button
        className="btn btn-outline-secondary"
        type="button"
        disabled={state.page + 1 >= state.totalPages}
        onClick={() => controller.fetchMoreProducts()}
      >
        Show More
      </button>
    </div>
  );
}
