import { useEffect, useState } from 'react';
import type { Summary as HeadlessSummary } from '@coveo/headless/commerce';
import type { SummaryState as HeadlessSummaryState } from '@coveo/headless/ssr-commerce';

interface SummaryState extends HeadlessSummaryState {
  query: string;
}

interface ISummaryProps {
  controller: HeadlessSummary;
}

export default function Summary(props: ISummaryProps) {
  const { controller } = props;
  const [state, setState] = useState<SummaryState>(controller.state as SummaryState);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state as SummaryState);
    });
    return () => unsubscribe();
  }, [controller]);

  return (
    <div className="mb-3 me-2 small">
      <span>
        Showing products {state.firstProduct} - {state.lastProduct} of{' '}
        {state.totalNumberOfProducts}
      </span>
      {state.query && (
        <span>
          {' '}for query <strong>{state.query}</strong>
        </span>
      )}
    </div>
  );
}
