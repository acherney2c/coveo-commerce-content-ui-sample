import { useEffect, useState } from 'react';
import type {
  DidYouMean as HeadlessDidYouMean,
  DidYouMeanState,
} from '@coveo/headless/commerce';

interface IDidYouMeanProps {
  controller: HeadlessDidYouMean;
}

export default function DidYouMean(props: IDidYouMeanProps) {
  const { controller } = props;
  const [state, setState] = useState<DidYouMeanState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const apply = () => {
    controller.applyCorrection();
  };

  if (!state.hasQueryCorrection) {
    return null;
  }

  if (state.wasAutomaticallyCorrected) {
    return (
      <div>
        <p>
          No results for <strong>{state.originalQuery}</strong>
        </p>
        <p>
          Query was automatically corrected to{' '}
          <strong>{state.wasCorrectedTo}</strong>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Search for{' '}
        <span onClick={apply} style={{ cursor: 'pointer' }}>
          <strong>{state.queryCorrection.correctedQuery}</strong>
        </span>{' '}
        instead?
      </p>
    </div>
  );
}
